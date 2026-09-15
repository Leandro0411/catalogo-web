import { describe, expect, it } from 'vitest';
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../index';
import { insertTenant } from '../test/factories';

interface CatalogBody {
  tenant: { name: string; ageGate: boolean };
  categories: unknown[];
  products: unknown[];
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
});
