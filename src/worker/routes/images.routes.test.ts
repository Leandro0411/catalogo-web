import { describe, expect, it } from 'vitest';
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../index';

async function fetchApp(path: string): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`http://localhost${path}`), env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

describe('images.routes', () => {
  it('responde 404 para una clave con formato inválido', async () => {
    const response = await fetchApp('/img/secreto');
    expect(response.status).toBe(404);
  });

  it('responde 404 para una clave bien formada pero inexistente', async () => {
    const response = await fetchApp(
      '/img/t/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222-480',
    );
    expect(response.status).toBe(404);
  });

  it('normaliza ../ antes del ruteo y no expone nada fuera de /img', async () => {
    const response = await fetchApp('/img/../secreto');
    expect(response.status).not.toBe(200);
  });
});
