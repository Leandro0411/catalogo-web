import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { loginSchema } from '../../shared/schemas/auth.schema';
import { sameOrigin } from '../middleware/same-origin';
import { requireAdmin } from '../middleware/require-admin';
import { login, logout } from '../services/auth.service';
import { SESSION_COOKIE_NAME, SESSION_TTL_DAYS } from '../lib/constants';
import type { AppEnv } from '../lib/hono-env.types';
import type { AdminMeResponse } from '../../shared/types/api.types';

const SECONDS_PER_DAY = 86_400;

export const adminAuthRoutes = new Hono<AppEnv>();

adminAuthRoutes.post('/login', sameOrigin, async (c) => {
  const body = loginSchema.parse(await c.req.json());
  const { token } = await login(c.env.DB, body, new Date());

  setCookie(c, SESSION_COOKIE_NAME, token, {
    prefix: 'host',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_DAYS * SECONDS_PER_DAY,
  });

  return c.body(null, 204);
});

adminAuthRoutes.post('/logout', sameOrigin, async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME, 'host');

  if (token) {
    await logout(c.env.DB, token);
  }

  deleteCookie(c, SESSION_COOKIE_NAME, { prefix: 'host', path: '/' });
  return c.body(null, 204);
});

adminAuthRoutes.get('/me', requireAdmin, (c) => {
  const admin = c.get('admin');
  const body: AdminMeResponse = {
    username: admin.username,
    tenant: {
      slug: admin.tenantSlug,
      name: admin.tenantName,
      primaryColor: admin.primaryColor,
      logoUrl: admin.logoUrl,
      currency: admin.currency,
    },
  };

  return c.json(body);
});
