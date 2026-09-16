import { deleteCookie, getCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import { ApiError } from '../lib/errors';
import { SESSION_COOKIE_NAME } from '../lib/constants';
import { getAdminContext } from '../services/auth.service';
import type { AppEnv } from '../lib/hono-env.types';

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME, 'host');
  const admin = token ? await getAdminContext(c.env.DB, token, new Date()) : null;

  if (!admin) {
    deleteCookie(c, SESSION_COOKIE_NAME, { prefix: 'host', path: '/' });
    throw new ApiError(401, 'UNAUTHENTICATED', 'Iniciá sesión');
  }

  c.set('admin', admin);
  await next();
};
