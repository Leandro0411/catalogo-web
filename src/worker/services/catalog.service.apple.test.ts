import { afterEach, describe, expect, it } from 'vitest';
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import rawMiphoneConfig from '../../../tenants/miphone.json';
import worker from '../index';
import { tenantConfigSchema } from '../../shared/schemas/tenant.schema';
import {
  insertAdmin,
  insertTenantFromConfig,
  loginAs,
  resetCatalogTables,
} from '../test/factories';

const ORIGIN_HEADERS = { Origin: 'http://localhost', Host: 'localhost' };
const miphoneConfig = tenantConfigSchema.parse(rawMiphoneConfig);

interface AdminProductBody {
  id: string;
  categoryId: string;
}

interface PublicProductBody {
  categoryKey: string;
  name: string;
  priceCents: number;
  currency: string;
  attributes: Record<string, string | number>;
}

interface PublicCatalogBody {
  products: PublicProductBody[];
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

async function setupMiphoneAdmin() {
  const { tenant, categoriesByKey } = await insertTenantFromConfig(env.DB, miphoneConfig);
  await insertAdmin(env.DB, { tenantId: tenant.id, username: 'miphone', password: 'Correcta123!' });
  const cookie = await loginAs('miphone', 'Correcta123!');

  return { tenant, categoriesByKey, cookie };
}

describe('criterios de aceptación de Apple', () => {
  afterEach(async () => {
    await resetCatalogTables(env.DB);
  });

  it('Apple AC01 — carga de unidad única con atributos', async () => {
    const { categoriesByKey, cookie } = await setupMiphoneAdmin();
    const iphoneCategory = categoriesByKey.get('iphone');

    if (!iphoneCategory) {
      throw new Error('La categoría iphone no se creó');
    }

    const input = {
      categoryId: iphoneCategory.id,
      name: 'iPhone 15 Pro Max 256GB (Natural) 87%',
      description: null,
      imageKey: null,
      priceCents: 73500,
      currency: 'USD',
      priceNote: null,
      stockMode: 'unit',
      stockQty: null,
      status: 'active',
      attributes: {
        modelo: 'iPhone 15 Pro Max',
        capacidad: '256GB',
        color: 'Natural',
        condicion: 'Usado',
        bateria: 87,
      },
      choices: [],
    };

    const createResponse = await fetchApp('/api/admin/products', jsonInit('POST', cookie, input));
    expect(createResponse.status).toBe(201);

    const catalogResponse = await fetchApp('/api/public/tenants/miphone/catalog');
    const catalog = (await catalogResponse.json()) as PublicCatalogBody;
    const product = catalog.products.find(
      (item) => item.name === 'iPhone 15 Pro Max 256GB (Natural) 87%',
    );

    expect(product?.categoryKey).toBe('iphone');
    expect(product?.currency).toBe('USD');
    expect(product?.attributes).toEqual(input.attributes);
  });

  it('Apple AC06 — un PUT se refleja de inmediato en el catálogo público, sin cache', async () => {
    const { categoriesByKey, cookie } = await setupMiphoneAdmin();
    const iphoneCategory = categoriesByKey.get('iphone');

    if (!iphoneCategory) {
      throw new Error('La categoría iphone no se creó');
    }

    const input = {
      categoryId: iphoneCategory.id,
      name: 'iPhone 13 128GB (Blue) 84%',
      description: null,
      imageKey: null,
      priceCents: 38000,
      currency: 'USD',
      priceNote: null,
      stockMode: 'unit',
      stockQty: null,
      status: 'active',
      attributes: {
        modelo: 'iPhone 13',
        capacidad: '128GB',
        color: 'Blue',
        condicion: 'Usado',
        bateria: 84,
      },
      choices: [],
    };

    const createResponse = await fetchApp('/api/admin/products', jsonInit('POST', cookie, input));
    const created = (await createResponse.json()) as AdminProductBody;

    const updateResponse = await fetchApp(
      `/api/admin/products/${created.id}`,
      jsonInit('PUT', cookie, {
        ...input,
        priceCents: 36000,
        attributes: { ...input.attributes, bateria: 88 },
      }),
    );
    expect(updateResponse.status).toBe(200);

    const catalogResponse = await fetchApp('/api/public/tenants/miphone/catalog');
    expect(catalogResponse.headers.get('Cache-Control')).toBe('no-store');

    const catalog = (await catalogResponse.json()) as PublicCatalogBody;
    const product = catalog.products.find((item) => item.name === 'iPhone 13 128GB (Blue) 84%');

    expect(product?.attributes.bateria).toBe(88);
    expect(product?.priceCents).toBe(36000);
  });
});
