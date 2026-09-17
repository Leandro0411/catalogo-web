import { afterEach, describe, expect, it } from 'vitest';
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../index';
import { insertAdmin, insertTenant, loginAs, resetCatalogTables } from '../test/factories';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

interface MeBody {
  username: string;
  tenant: {
    slug: string;
    name: string;
    primaryColor: string;
    logoUrl: string | null;
    currency: string;
  };
}

const ORIGIN_HEADERS = { Origin: 'http://localhost', Host: 'localhost' };
const EVIL_ORIGIN_HEADERS = { Origin: 'https://evil.example', Host: 'localhost' };

async function fetchApp(path: string, init?: RequestInit): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`http://localhost${path}`, init), env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

function loginRequestInit(
  username: string,
  password: string,
  headers: Record<string, string>,
): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ username, password }),
  };
}

describe('POST /api/admin/login', () => {
  afterEach(async () => {
    await resetCatalogTables(env.DB);
  });

  it('devuelve 401 INVALID_CREDENTIALS con el mismo cuerpo para usuario inexistente o clave incorrecta (E08)', async () => {
    const tenant = await insertTenant(env.DB, { slug: 'banned' });
    await insertAdmin(env.DB, {
      tenantId: tenant.id,
      username: 'leandro',
      password: 'Correcta123!',
    });

    const wrongPassword = await fetchApp(
      '/api/admin/login',
      loginRequestInit('leandro', 'incorrecta', ORIGIN_HEADERS),
    );
    const missingUser = await fetchApp(
      '/api/admin/login',
      loginRequestInit('no-existe', 'cualquiera', ORIGIN_HEADERS),
    );

    expect(wrongPassword.status).toBe(401);
    expect(missingUser.status).toBe(401);

    const wrongBody = (await wrongPassword.json()) as ErrorBody;
    const missingBody = (await missingUser.json()) as ErrorBody;

    expect(wrongBody.error.code).toBe('INVALID_CREDENTIALS');
    expect(missingBody.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrongBody.error.message).toBe(missingBody.error.message);
  });

  it('bloquea tras 5 intentos fallidos y desbloquea cuando locked_until pasó (E09)', async () => {
    const tenant = await insertTenant(env.DB, { slug: 'banned' });
    const admin = await insertAdmin(env.DB, {
      tenantId: tenant.id,
      username: 'leandro',
      password: 'Correcta123!',
    });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetchApp(
        '/api/admin/login',
        loginRequestInit('leandro', 'incorrecta', ORIGIN_HEADERS),
      );
      expect(response.status).toBe(401);
    }

    const fifthAttempt = await fetchApp(
      '/api/admin/login',
      loginRequestInit('leandro', 'incorrecta', ORIGIN_HEADERS),
    );
    expect(fifthAttempt.status).toBe(423);
    const lockedBody = (await fifthAttempt.json()) as ErrorBody;
    expect(lockedBody.error.code).toBe('ACCOUNT_LOCKED');

    const correctWhileLocked = await fetchApp(
      '/api/admin/login',
      loginRequestInit('leandro', 'Correcta123!', ORIGIN_HEADERS),
    );
    expect(correctWhileLocked.status).toBe(423);

    await env.DB.prepare(
      `UPDATE admin_users SET locked_until = datetime('now', '-1 minute') WHERE id = ?`,
    )
      .bind(admin.id)
      .run();

    const afterUnlock = await fetchApp(
      '/api/admin/login',
      loginRequestInit('leandro', 'Correcta123!', ORIGIN_HEADERS),
    );
    expect(afterUnlock.status).toBe(204);
  });

  it('devuelve 403 FORBIDDEN_ORIGIN sin Origin o con un origen ajeno (E11)', async () => {
    const tenant = await insertTenant(env.DB, { slug: 'banned' });
    await insertAdmin(env.DB, {
      tenantId: tenant.id,
      username: 'leandro',
      password: 'Correcta123!',
    });

    const withoutOrigin = await fetchApp('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Host: 'localhost' },
      body: JSON.stringify({ username: 'leandro', password: 'Correcta123!' }),
    });
    const evilOrigin = await fetchApp(
      '/api/admin/login',
      loginRequestInit('leandro', 'Correcta123!', EVIL_ORIGIN_HEADERS),
    );

    expect(withoutOrigin.status).toBe(403);
    expect(evilOrigin.status).toBe(403);

    const body = (await evilOrigin.json()) as ErrorBody;
    expect(body.error.code).toBe('FORBIDDEN_ORIGIN');
  });

  it('la cookie de sesión cumple los atributos de __Host- y el id guardado no es el token (AC05 parcial)', async () => {
    const tenant = await insertTenant(env.DB, { slug: 'banned' });
    await insertAdmin(env.DB, {
      tenantId: tenant.id,
      username: 'leandro',
      password: 'Correcta123!',
    });

    const response = await fetchApp(
      '/api/admin/login',
      loginRequestInit('leandro', 'Correcta123!', ORIGIN_HEADERS),
    );

    expect(response.status).toBe(204);

    const setCookie = response.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toContain('__Host-cat_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('Max-Age=2592000');

    const token = setCookie.split(';')[0]?.split('=')[1] ?? '';
    const session = await env.DB.prepare('SELECT id FROM sessions').first<{ id: string }>();
    expect(session?.id).toBeDefined();
    expect(session?.id).not.toBe(token);
  });
});

describe('GET /api/admin/me', () => {
  afterEach(async () => {
    await resetCatalogTables(env.DB);
  });

  it('devuelve el tenant propio de cada admin logueado (AC05)', async () => {
    const banned = await insertTenant(env.DB, {
      slug: 'banned',
      name: 'BANNED',
      logo_key: 't/tenant-banned/logo-1',
    });
    const demo = await insertTenant(env.DB, { slug: 'demo', name: 'Tienda Demo' });
    await insertAdmin(env.DB, {
      tenantId: banned.id,
      username: 'leandro',
      password: 'Correcta123!',
    });
    await insertAdmin(env.DB, { tenantId: demo.id, username: 'ana', password: 'OtraClave456!' });

    const bannedCookie = await loginAs('leandro', 'Correcta123!');
    const demoCookie = await loginAs('ana', 'OtraClave456!');

    const bannedMe = await fetchApp('/api/admin/me', { headers: { Cookie: bannedCookie } });
    const demoMe = await fetchApp('/api/admin/me', { headers: { Cookie: demoCookie } });

    const bannedBody = (await bannedMe.json()) as MeBody;
    const demoBody = (await demoMe.json()) as MeBody;

    expect(bannedBody.tenant.slug).toBe('banned');
    expect(bannedBody.tenant.logoUrl).toBe('/img/t/tenant-banned/logo-1');
    expect(demoBody.tenant.slug).toBe('demo');
    expect(demoBody.tenant.logoUrl).toBeNull();
  });

  it('devuelve 401 UNAUTHENTICATED sin cookie, con token aleatorio o con sesión vencida (E10)', async () => {
    const tenant = await insertTenant(env.DB, { slug: 'banned' });
    await insertAdmin(env.DB, {
      tenantId: tenant.id,
      username: 'leandro',
      password: 'Correcta123!',
    });

    const withoutCookie = await fetchApp('/api/admin/me');
    expect(withoutCookie.status).toBe(401);

    const randomCookie = await fetchApp('/api/admin/me', {
      headers: { Cookie: '__Host-cat_session=token-inventado' },
    });
    expect(randomCookie.status).toBe(401);

    const cookie = await loginAs('leandro', 'Correcta123!');
    await env.DB.prepare(`UPDATE sessions SET expires_at = datetime('now', '-1 minute')`).run();

    const expiredResponse = await fetchApp('/api/admin/me', { headers: { Cookie: cookie } });
    expect(expiredResponse.status).toBe(401);
    const expiredBody = (await expiredResponse.json()) as ErrorBody;
    expect(expiredBody.error.code).toBe('UNAUTHENTICATED');

    const remainingSessions = await env.DB.prepare('SELECT COUNT(*) as total FROM sessions').first<{
      total: number;
    }>();
    expect(remainingSessions?.total).toBe(0);
  });
});

describe('POST /api/admin/logout', () => {
  afterEach(async () => {
    await resetCatalogTables(env.DB);
  });

  it('borra la sesión y /me responde 401 después de logout', async () => {
    const tenant = await insertTenant(env.DB, { slug: 'banned' });
    await insertAdmin(env.DB, {
      tenantId: tenant.id,
      username: 'leandro',
      password: 'Correcta123!',
    });

    const cookie = await loginAs('leandro', 'Correcta123!');
    const meBeforeLogout = await fetchApp('/api/admin/me', { headers: { Cookie: cookie } });
    expect(meBeforeLogout.status).toBe(200);

    const logoutResponse = await fetchApp('/api/admin/logout', {
      method: 'POST',
      headers: { Cookie: cookie, ...ORIGIN_HEADERS },
    });
    expect(logoutResponse.status).toBe(204);

    const meAfterLogout = await fetchApp('/api/admin/me', { headers: { Cookie: cookie } });
    expect(meAfterLogout.status).toBe(401);
  });
});
