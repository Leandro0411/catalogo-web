import { Hono } from 'hono';
import { securityHeaders } from './middleware/security-headers';
import { publicRoutes } from './routes/public.routes';
import { errorHandler } from './lib/errors';
import type { ApiErrorBody } from '../shared/types/api.types';

export function createApp() {
  const app = new Hono<{ Bindings: Env }>();

  app.use('/api/*', securityHeaders);
  app.route('/api/public', publicRoutes);

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
