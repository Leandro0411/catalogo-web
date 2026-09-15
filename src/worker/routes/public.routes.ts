import { Hono } from 'hono';
import { slugSchema } from '../../shared/schemas/tenant.schema';
import { ApiError } from '../lib/errors';
import { getPublicCatalog } from '../services/catalog.service';

export const publicRoutes = new Hono<{ Bindings: Env }>();

publicRoutes.get('/tenants/:slug/catalog', async (c) => {
  const slugResult = slugSchema.safeParse(c.req.param('slug'));

  if (!slugResult.success) {
    throw new ApiError(404, 'TENANT_NOT_FOUND', 'Catálogo no encontrado');
  }

  const catalog = await getPublicCatalog(c.env.DB, slugResult.data);

  return c.json(catalog, 200, { 'Cache-Control': 'no-store' });
});
