import { afterEach, describe, expect, it } from 'vitest';
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../index';
import {
  insertAdmin,
  insertCategory,
  insertProduct,
  insertTenant,
  loginAs,
  resetCatalogTables,
} from '../test/factories';
import type { CategoryRow, TenantRow } from '../repositories/row.types';

const ORIGIN_HEADERS = { Origin: 'http://localhost', Host: 'localhost' };
const FOREIGN_ORIGIN_HEADERS = { Origin: 'http://evil.example', Host: 'localhost' };

const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const SVG_BYTES = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

interface ErrorBody {
  error: { code: string; message: string };
}

interface UploadBody {
  imageKey: string;
}

interface PublicCatalogBody {
  products: Array<{ name: string; image: { thumb: string; full: string } | null }>;
}

async function fetchApp(path: string, init?: RequestInit): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`http://localhost${path}`, init), env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

function jsonInit(method: string, cookie: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie, ...ORIGIN_HEADERS },
    body: JSON.stringify(body),
  };
}

function uploadInit(
  cookie: string,
  fields: Record<string, Blob>,
  headers: Record<string, string> = ORIGIN_HEADERS,
): RequestInit {
  const form = new FormData();

  for (const [key, blob] of Object.entries(fields)) {
    form.append(key, blob, `${key}.webp`);
  }

  return { method: 'POST', headers: { Cookie: cookie, ...headers }, body: form };
}

function validProductInput(categoryId: string, overrides: Record<string, unknown> = {}) {
  return {
    categoryId,
    name: 'ICE STORM',
    description: null,
    imageKey: null,
    priceCents: 2800000,
    currency: 'ARS',
    priceNote: null,
    stockMode: 'availability',
    stockQty: null,
    status: 'active',
    attributes: { puffs: 25000 },
    choices: [],
    ...overrides,
  };
}

interface BannedAdminSetup {
  tenant: TenantRow;
  category: CategoryRow;
  cookie: string;
}

async function setupBannedAdmin(): Promise<BannedAdminSetup> {
  const tenant = await insertTenant(env.DB, { slug: 'banned', name: 'BANNED' });
  const category = await insertCategory(env.DB, tenant.id, { key: 'vapes', choice_label: 'Sabor' });
  await insertAdmin(env.DB, { tenantId: tenant.id, username: 'leandro', password: 'Correcta123!' });
  const cookie = await loginAs('leandro', 'Correcta123!');

  return { tenant, category, cookie };
}

describe('admin-images.routes', () => {
  afterEach(async () => {
    await resetCatalogTables(env.DB);
  });

  it('sube una foto y la usa en un producto visible en el catálogo (AC03 con foto)', async () => {
    const { category, cookie } = await setupBannedAdmin();

    const uploadResponse = await fetchApp(
      '/api/admin/images',
      uploadInit(cookie, {
        thumb: new Blob([WEBP_BYTES]),
        full: new Blob([WEBP_BYTES]),
      }),
    );
    expect(uploadResponse.status).toBe(201);
    const { imageKey } = (await uploadResponse.json()) as UploadBody;

    const createResponse = await fetchApp(
      '/api/admin/products',
      jsonInit(
        'POST',
        cookie,
        validProductInput(category.id, {
          imageKey,
          choices: [{ value: 'Mint', available: true }],
        }),
      ),
    );
    expect(createResponse.status).toBe(201);

    const catalogResponse = await fetchApp('/api/public/tenants/banned/catalog');
    const catalog = (await catalogResponse.json()) as PublicCatalogBody;
    const iceStorm = catalog.products.find((p) => p.name === 'ICE STORM');
    expect(iceStorm?.image?.thumb).toBe(`/img/${imageKey}-480`);

    const imageResponse = await fetchApp(iceStorm?.image?.thumb ?? '');
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers.get('Content-Type')).toBe('image/webp');
    expect(imageResponse.headers.get('Cache-Control')).toContain('immutable');
  });

  it('rechaza un SVG con 415 UNSUPPORTED_MEDIA_TYPE (E14)', async () => {
    const { cookie } = await setupBannedAdmin();

    const response = await fetchApp(
      '/api/admin/images',
      uploadInit(cookie, { thumb: new Blob([WEBP_BYTES]), full: new Blob([SVG_BYTES]) }),
    );

    expect(response.status).toBe(415);
    expect(((await response.json()) as ErrorBody).error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rechaza una variante de más de 1 MB con 413 PAYLOAD_TOO_LARGE (E14)', async () => {
    const { cookie } = await setupBannedAdmin();
    const big = new Uint8Array(1_048_577);
    big.set(WEBP_BYTES, 0);

    const response = await fetchApp(
      '/api/admin/images',
      uploadInit(cookie, { thumb: new Blob([WEBP_BYTES]), full: new Blob([big]) }),
    );

    expect(response.status).toBe(413);
    expect(((await response.json()) as ErrorBody).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('responde 400 si falta el campo full (E14)', async () => {
    const { cookie } = await setupBannedAdmin();

    const response = await fetchApp(
      '/api/admin/images',
      uploadInit(cookie, { thumb: new Blob([WEBP_BYTES]) }),
    );

    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).error.code).toBe('VALIDATION_ERROR');
  });

  it('responde 401 sin sesión (E14)', async () => {
    const response = await fetchApp(
      '/api/admin/images',
      uploadInit('', { thumb: new Blob([WEBP_BYTES]), full: new Blob([WEBP_BYTES]) }),
    );

    expect(response.status).toBe(401);
  });

  it('responde 403 con un Origin ajeno (E14)', async () => {
    const { cookie } = await setupBannedAdmin();

    const response = await fetchApp(
      '/api/admin/images',
      uploadInit(
        cookie,
        { thumb: new Blob([WEBP_BYTES]), full: new Blob([WEBP_BYTES]) },
        FOREIGN_ORIGIN_HEADERS,
      ),
    );

    expect(response.status).toBe(403);
  });

  it('rechaza la imagen de otro tenant con 400 INVALID_IMAGE (AC05 imágenes)', async () => {
    const { category, cookie } = await setupBannedAdmin();
    const demoTenant = await insertTenant(env.DB, { slug: 'demo', name: 'Tienda Demo' });

    const response = await fetchApp(
      '/api/admin/products',
      jsonInit(
        'POST',
        cookie,
        validProductInput(category.id, {
          imageKey: `t/${demoTenant.id}/11111111-1111-4111-8111-111111111111`,
        }),
      ),
    );

    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).error.code).toBe('INVALID_IMAGE');
  });

  it('libera la imagen anterior cuando PUT la cambia y ya no la usa nadie', async () => {
    const { tenant, category, cookie } = await setupBannedAdmin();

    const uploadOld = await fetchApp(
      '/api/admin/images',
      uploadInit(cookie, { thumb: new Blob([WEBP_BYTES]), full: new Blob([WEBP_BYTES]) }),
    );
    const { imageKey: oldImageKey } = (await uploadOld.json()) as UploadBody;

    const product = await insertProduct(env.DB, tenant.id, category.id, {
      image_key: oldImageKey,
    });

    expect((await fetchApp(`/img/${oldImageKey}-480`)).status).toBe(200);

    const uploadNew = await fetchApp(
      '/api/admin/images',
      uploadInit(cookie, { thumb: new Blob([WEBP_BYTES]), full: new Blob([WEBP_BYTES]) }),
    );
    const { imageKey: newImageKey } = (await uploadNew.json()) as UploadBody;

    const putResponse = await fetchApp(
      `/api/admin/products/${product.id}`,
      jsonInit(
        'PUT',
        cookie,
        validProductInput(category.id, { name: product.name, imageKey: newImageKey }),
      ),
    );
    expect(putResponse.status).toBe(200);

    expect((await fetchApp(`/img/${oldImageKey}-480`)).status).toBe(404);
    expect((await fetchApp(`/img/${newImageKey}-480`)).status).toBe(200);
  });
});
