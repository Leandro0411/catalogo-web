import type { MiddlewareHandler } from 'hono';

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
};

const SCRIPT_SRC = import.meta.env.DEV ? "'self' 'unsafe-inline'" : "'self'";

// style-src necesita 'unsafe-inline': brandStyle() aplica el color de marca de cada
// tenant vía el atributo style de React (variables --brand/--brand-contrast).
const HTML_CSP =
  `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; ` +
  `script-src ${SCRIPT_SRC}; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; ` +
  "base-uri 'self'; form-action 'self'";

export const htmlSecurityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  c.res.headers.set('Content-Security-Policy', HTML_CSP);
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
};
