import { afterEach, describe, expect, it } from 'vitest';
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../index';
import { insertCategory, insertProduct, insertTenant, resetCatalogTables } from '../test/factories';

interface CatalogProduct {
  id: string;
  categoryKey: string;
  name: string;
  priceCents: number;
  currency: string;
  attributes: Record<string, string | number>;
  choices: string[];
}

interface CatalogBody {
  tenant: { name: string; ageGate: boolean };
  categories: Array<{ key: string; choiceLabel: string | null }>;
  products: CatalogProduct[];
}

interface ErrorBody {
  error: { code: string };
}

async function fetchApp(path: string): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`http://localhost${path}`), env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

describe('GET /api/public/tenants/:slug/catalog', () => {
  afterEach(async () => {
    await resetCatalogTables(env.DB);
  });

  it('devuelve el catálogo público del tenant activo (AC06)', async () => {
    await insertTenant(env.DB, { slug: 'banned', name: 'BANNED', age_gate: 1 });

    const response = await fetchApp('/api/public/tenants/banned/catalog');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const body = (await response.json()) as CatalogBody;
    expect(body.tenant.name).toBe('BANNED');
    expect(body.tenant.ageGate).toBe(true);
    expect(Array.isArray(body.categories)).toBe(true);
    expect(Array.isArray(body.products)).toBe(true);
  });

  it('devuelve 404 TENANT_NOT_FOUND para un slug inexistente (E01)', async () => {
    const response = await fetchApp('/api/public/tenants/no-existe/catalog');

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorBody;
    expect(body.error.code).toBe('TENANT_NOT_FOUND');
  });

  it('devuelve 404 TENANT_NOT_FOUND para un tenant inactivo (E01)', async () => {
    await insertTenant(env.DB, { slug: 'demo', name: 'Tienda Demo', is_active: 0 });

    const response = await fetchApp('/api/public/tenants/demo/catalog');

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorBody;
    expect(body.error.code).toBe('TENANT_NOT_FOUND');
  });

  it('devuelve el producto con atributos, precio y sabores disponibles (AC01)', async () => {
    const tenant = await insertTenant(env.DB, { slug: 'banned', name: 'BANNED' });
    const category = await insertCategory(env.DB, tenant.id, {
      key: 'vapes',
      choice_label: 'Sabor',
    });
    await insertProduct(env.DB, tenant.id, category.id, {
      name: 'THE BLACK SHEEP',
      price_cents: 2600000,
      currency: 'ARS',
      attributes: JSON.stringify({ puffs: 30000 }),
      choices: JSON.stringify([{ value: 'Grape / Strawberry Kiwi 🍇🍓🥝', available: true }]),
    });

    const response = await fetchApp('/api/public/tenants/banned/catalog');
    const body = (await response.json()) as CatalogBody;

    expect(body.categories[0]?.choiceLabel).toBe('Sabor');
    const product = body.products[0];
    expect(product?.priceCents).toBe(2600000);
    expect(product?.currency).toBe('ARS');
    expect(product?.attributes.puffs).toBe(30000);
    expect(product?.choices).toEqual(['Grape / Strawberry Kiwi 🍇🍓🥝']);
    expect(product?.categoryKey).toBe('vapes');
  });

  it('no muestra un producto pausado (AC02)', async () => {
    const tenant = await insertTenant(env.DB, { slug: 'banned' });
    const category = await insertCategory(env.DB, tenant.id);
    await insertProduct(env.DB, tenant.id, category.id, {
      name: 'THE BLACK SHEEP',
      status: 'paused',
    });

    const response = await fetchApp('/api/public/tenants/banned/catalog');
    const body = (await response.json()) as CatalogBody;

    expect(body.products).toHaveLength(0);
  });

  it('oculta productos sin sabores disponibles y lista solo los disponibles en los demás (E03)', async () => {
    const tenant = await insertTenant(env.DB, { slug: 'banned' });
    const category = await insertCategory(env.DB, tenant.id, { choice_label: 'Sabor' });
    await insertProduct(env.DB, tenant.id, category.id, {
      name: 'THE BLACK SHEEP',
      choices: JSON.stringify([
        { value: 'Grape / Strawberry Kiwi 🍇🍓🥝', available: true },
        { value: 'Peach Mango 🍑🥭', available: false },
      ]),
    });
    await insertProduct(env.DB, tenant.id, category.id, {
      name: 'GHOST',
      choices: JSON.stringify([{ value: 'Mint 🌿', available: false }]),
    });

    const response = await fetchApp('/api/public/tenants/banned/catalog');
    const body = (await response.json()) as CatalogBody;

    const names = body.products.map((product) => product.name);
    expect(names).toContain('THE BLACK SHEEP');
    expect(names).not.toContain('GHOST');

    const blackSheep = body.products.find((product) => product.name === 'THE BLACK SHEEP');
    expect(blackSheep?.choices).toEqual(['Grape / Strawberry Kiwi 🍇🍓🥝']);
  });

  it('no muestra productos de otro tenant (aislamiento)', async () => {
    const banned = await insertTenant(env.DB, { slug: 'banned' });
    const demo = await insertTenant(env.DB, { slug: 'demo', name: 'Tienda Demo' });
    await insertCategory(env.DB, banned.id);
    const demoCategory = await insertCategory(env.DB, demo.id, {
      key: 'general',
      name: 'General',
      choice_label: null,
    });
    await insertProduct(env.DB, demo.id, demoCategory.id, { name: 'Producto Demo' });

    const response = await fetchApp('/api/public/tenants/banned/catalog');
    const body = (await response.json()) as CatalogBody;

    expect(body.products.find((product) => product.name === 'Producto Demo')).toBeUndefined();
  });
});
