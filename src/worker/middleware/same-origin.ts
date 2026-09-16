import type { MiddlewareHandler } from 'hono';
import { ApiError } from '../lib/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const sameOrigin: MiddlewareHandler = async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) {
    await next();
    return;
  }

  const origin = c.req.header('Origin');
  const host = c.req.header('Host');

  if (!origin || !host) {
    throw new ApiError(403, 'FORBIDDEN_ORIGIN', 'Origen no permitido');
  }

  let originHost: string;

  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, 'FORBIDDEN_ORIGIN', 'Origen no permitido');
  }

  if (originHost !== host) {
    throw new ApiError(403, 'FORBIDDEN_ORIGIN', 'Origen no permitido');
  }

  await next();
};
