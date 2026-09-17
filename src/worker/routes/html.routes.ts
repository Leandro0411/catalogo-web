import { Hono } from 'hono';
import { htmlSecurityHeaders } from '../middleware/security-headers';
import { applyShellMeta, buildShellMeta } from '../services/shell.service';

const FILE_EXTENSION_PATTERN = /\.[a-zA-Z0-9]+$/;
const DEV_INTERNAL_PATTERN = /^\/@/;

function isPassthroughPath(path: string): boolean {
  return FILE_EXTENSION_PATTERN.test(path) || DEV_INTERNAL_PATTERN.test(path);
}

export const htmlRoutes = new Hono<{ Bindings: Env }>();

htmlRoutes.get(
  '*',
  async (c, next) => {
    if (isPassthroughPath(c.req.path)) {
      return c.env.ASSETS.fetch(c.req.raw);
    }
    await next();
  },
  htmlSecurityHeaders,
  async (c) => {
    const [shellResponse, meta] = await Promise.all([
      c.env.ASSETS.fetch(new Request(new URL('/', c.req.url))),
      buildShellMeta(c.env.DB, new URL(c.req.url)),
    ]);

    return applyShellMeta(shellResponse, meta);
  },
);
