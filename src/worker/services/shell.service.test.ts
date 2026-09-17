import { afterEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { applyShellMeta, buildShellMeta } from './shell.service';
import { insertTenant, resetCatalogTables } from '../test/factories';
import type { ShellMeta } from './shell.service';

function htmlResponse(): Response {
  return new Response('<html><head><title>Catálogo</title></head><body></body></html>', {
    headers: { 'Content-Type': 'text/html' },
  });
}

describe('buildShellMeta', () => {
  afterEach(async () => {
    await resetCatalogTables(env.DB);
  });

  it('devuelve el título del tenant, noindex y el logo absoluto', async () => {
    await insertTenant(env.DB, {
      slug: 'banned',
      name: 'BANNED',
      logo_key: 't/x/logo-1',
      noindex: 1,
    });

    const meta = await buildShellMeta(env.DB, new URL('http://localhost/banned'));

    expect(meta.title).toBe('BANNED');
    expect(meta.status).toBe(200);
    expect(meta.noindex).toBe(true);
    expect(meta.imageUrl).toBe('http://localhost/img/t/x/logo-1');
  });

  it('un slug inexistente responde 404 y noindex', async () => {
    const meta = await buildShellMeta(env.DB, new URL('http://localhost/no-existe'));

    expect(meta.status).toBe(404);
    expect(meta.noindex).toBe(true);
  });

  it('/admin* es noindex', async () => {
    const meta = await buildShellMeta(env.DB, new URL('http://localhost/admin/login'));

    expect(meta.noindex).toBe(true);
  });

  it('/ es indexable', async () => {
    const meta = await buildShellMeta(env.DB, new URL('http://localhost/'));

    expect(meta.noindex).toBe(false);
    expect(meta.status).toBe(200);
  });

  it('sin logo, imageUrl es null (nunca una foto de producto)', async () => {
    await insertTenant(env.DB, { slug: 'sinfoto', name: 'Sin Foto', logo_key: null });

    const meta = await buildShellMeta(env.DB, new URL('http://localhost/sinfoto'));

    expect(meta.imageUrl).toBeNull();
  });
});

describe('applyShellMeta', () => {
  it('reemplaza el título y agrega metadatos og:*', async () => {
    const meta: ShellMeta = {
      status: 200,
      title: 'BANNED',
      description: 'Catálogo de BANNED',
      imageUrl: 'http://localhost/img/t/x/logo-1',
      noindex: true,
      url: 'http://localhost/banned',
    };

    const response = applyShellMeta(htmlResponse(), meta);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(text).toContain('<title>BANNED</title>');
    expect(text).toContain('<meta property="og:title" content="BANNED">');
    expect(text).toContain('<meta property="og:image" content="http://localhost/img/t/x/logo-1">');
    expect(text).toContain('<meta name="robots" content="noindex, nofollow">');
  });

  it('escapa un título malicioso sin inyectar etiquetas', async () => {
    const meta: ShellMeta = {
      status: 200,
      title: '<script>x</script>',
      description: 'x',
      imageUrl: null,
      noindex: false,
      url: 'http://localhost/malicioso',
    };

    const response = applyShellMeta(htmlResponse(), meta);
    const text = await response.text();

    expect(text).not.toContain('<script>x</script>');
    expect(text).toContain('&lt;script&gt;x&lt;/script&gt;');
  });

  it('sin noindex, no agrega X-Robots-Tag ni el meta robots', async () => {
    const meta: ShellMeta = {
      status: 200,
      title: 'Catálogos online',
      description: 'x',
      imageUrl: null,
      noindex: false,
      url: 'http://localhost/',
    };

    const response = applyShellMeta(htmlResponse(), meta);
    const text = await response.text();

    expect(response.headers.get('X-Robots-Tag')).toBeNull();
    expect(text).not.toContain('name="robots"');
  });

  it('aplica el status recibido (404 para un tenant inexistente)', async () => {
    const meta: ShellMeta = {
      status: 404,
      title: 'Catálogo no encontrado',
      description: 'Catálogo no encontrado',
      imageUrl: null,
      noindex: true,
      url: 'http://localhost/no-existe',
    };

    const response = applyShellMeta(htmlResponse(), meta);

    expect(response.status).toBe(404);
  });
});
