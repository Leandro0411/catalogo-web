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

interface ErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

interface AdminProductBody {
  id: string;
  name: string;
  hiddenReason: string | null;
}

interface PublicCatalogBody {
  products: Array<{ name: string }>;
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

describe('admin-products.routes', () => {
  afterEach(async () => {
    await resetCatalogTables(env.DB);
  });

  it('da de alta un producto visible en el catálogo de banned pero no en demo (AC03)', async () => {
    const { category, cookie } = await setupBannedAdmin();
    await insertTenant(env.DB, { slug: 'demo', name: 'Tienda Demo' });

    const input = validProductInput(category.id, {
      attributes: { puffs: 25000 },
      choices: [
        { value: 'Mint / Menthol', available: true },
        { value: 'Mango / Piña', available: true },
      ],
    });

    const createResponse = await fetchApp('/api/admin/products', jsonInit('POST', cookie, input));
    expect(createResponse.status).toBe(201);

    const bannedCatalog = await fetchApp('/api/public/tenants/banned/catalog');
    const bannedBody = (await bannedCatalog.json()) as PublicCatalogBody;
    expect(bannedBody.products.some((p) => p.name === 'ICE STORM')).toBe(true);

    const demoCatalog = await fetchApp('/api/public/tenants/demo/catalog');
    const demoBody = (await demoCatalog.json()) as PublicCatalogBody;
    expect(demoBody.products.some((p) => p.name === 'ICE STORM')).toBe(false);
  });

  it('pausar saca el producto del catálogo público y "active" lo devuelve (AC02)', async () => {
    const { tenant, category, cookie } = await setupBannedAdmin();
    const product = await insertProduct(env.DB, tenant.id, category.id, {
      name: 'THE BLACK SHEEP',
    });

    const pauseResponse = await fetchApp(
      `/api/admin/products/${product.id}/status`,
      jsonInit('PATCH', cookie, { status: 'paused' }),
    );
    expect(pauseResponse.status).toBe(200);

    const afterPause = (await (
      await fetchApp('/api/public/tenants/banned/catalog')
    ).json()) as PublicCatalogBody;
    expect(afterPause.products).toHaveLength(0);

    const activateResponse = await fetchApp(
      `/api/admin/products/${product.id}/status`,
      jsonInit('PATCH', cookie, { status: 'active' }),
    );
    expect(activateResponse.status).toBe(200);

    const afterActivate = (await (
      await fetchApp('/api/public/tenants/banned/catalog')
    ).json()) as PublicCatalogBody;
    expect(afterActivate.products.some((p) => p.name === 'THE BLACK SHEEP')).toBe(true);
  });

  it('aisla productos entre tenants: listado, GET/PUT/PATCH/DELETE de otro tenant dan 404 (AC05)', async () => {
    const { tenant: banned, category: bannedCategory, cookie } = await setupBannedAdmin();
    const demoTenant = await insertTenant(env.DB, { slug: 'demo', name: 'Tienda Demo' });
    const demoCategory = await insertCategory(env.DB, demoTenant.id, {
      key: 'general',
      name: 'General',
      choice_label: null,
    });
    const demoProduct = await insertProduct(env.DB, demoTenant.id, demoCategory.id, {
      name: 'Producto Demo',
    });
    await insertProduct(env.DB, banned.id, bannedCategory.id, { name: 'THE BLACK SHEEP' });

    const listResponse = await fetchApp('/api/admin/products', { headers: { Cookie: cookie } });
    const listBody = (await listResponse.json()) as AdminProductBody[];
    expect(listBody.some((p) => p.name === 'Producto Demo')).toBe(false);
    expect(listBody.some((p) => p.name === 'THE BLACK SHEEP')).toBe(true);

    const getResponse = await fetchApp(`/api/admin/products/${demoProduct.id}`, {
      headers: { Cookie: cookie },
    });
    expect(getResponse.status).toBe(404);

    const putResponse = await fetchApp(
      `/api/admin/products/${demoProduct.id}`,
      jsonInit('PUT', cookie, validProductInput(bannedCategory.id, { name: 'Hackeado' })),
    );
    expect(putResponse.status).toBe(404);

    const patchResponse = await fetchApp(
      `/api/admin/products/${demoProduct.id}/status`,
      jsonInit('PATCH', cookie, { status: 'paused' }),
    );
    expect(patchResponse.status).toBe(404);

    const deleteResponse = await fetchApp(`/api/admin/products/${demoProduct.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie, ...ORIGIN_HEADERS },
    });
    expect(deleteResponse.status).toBe(404);

    for (const response of [getResponse, putResponse, patchResponse, deleteResponse]) {
      const body = (await response.json()) as ErrorBody;
      expect(body.error.code).toBe('PRODUCT_NOT_FOUND');
    }

    const stillThere = await env.DB.prepare('SELECT name FROM products WHERE id = ?')
      .bind(demoProduct.id)
      .first<{ name: string }>();
    expect(stillThere?.name).toBe('Producto Demo');
  });

  describe('validaciones (E12)', () => {
    it('responde 400 VALIDATION_ERROR si falta un atributo requerido', async () => {
      const { category, cookie } = await setupBannedAdmin();
      const input = validProductInput(category.id, { attributes: {} });

      const response = await fetchApp('/api/admin/products', jsonInit('POST', cookie, input));
      expect(response.status).toBe(400);

      const body = (await response.json()) as ErrorBody;
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect((body.error.details?.attributes as Record<string, string> | undefined)?.puffs).toBe(
        'Obligatorio',
      );
    });

    it('responde 400 con priceCents negativo', async () => {
      const { category, cookie } = await setupBannedAdmin();
      const input = validProductInput(category.id, { priceCents: -1 });

      const response = await fetchApp('/api/admin/products', jsonInit('POST', cookie, input));
      expect(response.status).toBe(400);
    });

    it('responde 400 si manda choices en una categoría sin choiceLabel', async () => {
      const { tenant, cookie } = await setupBannedAdmin();
      const noChoiceCategory = await insertCategory(env.DB, tenant.id, {
        key: 'general',
        name: 'General',
        choice_label: null,
      });
      const input = validProductInput(noChoiceCategory.id, {
        attributes: { puffs: 100 },
        choices: [{ value: 'Algo', available: true }],
      });

      const response = await fetchApp('/api/admin/products', jsonInit('POST', cookie, input));
      expect(response.status).toBe(400);

      const body = (await response.json()) as ErrorBody;
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('responde 400 con status sold y stockMode distinto de unit', async () => {
      const { category, cookie } = await setupBannedAdmin();
      const input = validProductInput(category.id, { status: 'sold', stockMode: 'availability' });

      const response = await fetchApp('/api/admin/products', jsonInit('POST', cookie, input));
      expect(response.status).toBe(400);
    });
  });

  it('responde 400 INVALID_CATEGORY con la categoría de otro tenant (E13)', async () => {
    const { cookie } = await setupBannedAdmin();
    const demoTenant = await insertTenant(env.DB, { slug: 'demo', name: 'Tienda Demo' });
    const demoCategory = await insertCategory(env.DB, demoTenant.id, {
      key: 'general',
      name: 'General',
      choice_label: null,
    });

    const input = validProductInput(demoCategory.id, { attributes: {} });
    const response = await fetchApp('/api/admin/products', jsonInit('POST', cookie, input));

    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorBody;
    expect(body.error.code).toBe('INVALID_CATEGORY');
  });

  describe('acceso y visibilidad', () => {
    it('responde 401 sin sesión', async () => {
      const response = await fetchApp('/api/admin/products');
      expect(response.status).toBe(401);
    });

    it('responde 403 FORBIDDEN_ORIGIN en POST sin Origin', async () => {
      const { category, cookie } = await setupBannedAdmin();
      const response = await fetchApp('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie, Host: 'localhost' },
        body: JSON.stringify(validProductInput(category.id)),
      });
      expect(response.status).toBe(403);
    });

    it('un producto con todas las opciones apagadas tiene hiddenReason NO_CHOICES_AVAILABLE', async () => {
      const { tenant, category, cookie } = await setupBannedAdmin();
      await insertProduct(env.DB, tenant.id, category.id, {
        name: 'GHOST',
        choices: JSON.stringify([{ value: 'Mint', available: false }]),
      });

      const response = await fetchApp('/api/admin/products', { headers: { Cookie: cookie } });
      const body = (await response.json()) as AdminProductBody[];
      const ghost = body.find((p) => p.name === 'GHOST');

      expect(ghost?.hiddenReason).toBe('NO_CHOICES_AVAILABLE');
    });
  });
});
