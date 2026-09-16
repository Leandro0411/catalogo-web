import { Hono } from 'hono';
import { requireAdmin } from '../middleware/require-admin';
import { sameOrigin } from '../middleware/same-origin';
import { ApiError } from '../lib/errors';
import { saveProductImage } from '../services/images/images.service';
import { createImageStore } from '../services/images/kv-image-store';
import type { AppEnv } from '../lib/hono-env.types';

export const adminImagesRoutes = new Hono<AppEnv>();

adminImagesRoutes.use('*', requireAdmin);

adminImagesRoutes.post('/images', sameOrigin, async (c) => {
  const admin = c.get('admin');
  const body = await c.req.parseBody();
  const thumb = body.thumb;
  const full = body.full;

  if (!(thumb instanceof File) || !(full instanceof File)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Faltan los archivos thumb y full');
  }

  const [thumbBuffer, fullBuffer] = await Promise.all([thumb.arrayBuffer(), full.arrayBuffer()]);
  const store = createImageStore(c.env);
  const imageKey = await saveProductImage(store, admin.tenantId, thumbBuffer, fullBuffer);

  return c.json({ imageKey }, 201);
});
