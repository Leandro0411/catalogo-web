import { Hono } from 'hono';
import { securityHeaders } from './middleware/security-headers';
import { noStore } from './middleware/no-store';
import { publicRoutes } from './routes/public.routes';
import { adminAuthRoutes } from './routes/admin-auth.routes';
import { adminProductsRoutes } from './routes/admin-products.routes';
import { adminImagesRoutes } from './routes/admin-images.routes';
import { imagesRoutes } from './routes/images.routes';
import { errorHandler } from './lib/errors';
import type { AppEnv } from './lib/hono-env.types';
import type { ApiErrorBody } from '../shared/types/api.types';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('/api/*', securityHeaders);
  app.use('/api/admin/*', noStore);
  app.route('/api/public', publicRoutes);
  app.route('/api/admin', adminAuthRoutes);
  app.route('/api/admin', adminProductsRoutes);
  app.route('/api/admin', adminImagesRoutes);
  app.route('/', imagesRoutes);

  app.notFound((c) => {
    if (c.req.path.startsWith('/api/')) {
      const body: ApiErrorBody = { error: { code: 'NOT_FOUND', message: 'No encontrado' } };
      return c.json(body, 404);
    }
    return c.env.ASSETS.fetch(c.req.raw);
  });

  app.onError(errorHandler);

  return app;
}
