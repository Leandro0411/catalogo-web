import { Hono } from 'hono';
import { ApiError } from '../lib/errors';
import { createImageStore } from '../services/images/kv-image-store';

const IMAGE_KEY_PATTERN = /^t\/[0-9a-f-]{36}\/(?:[0-9a-f-]{36}-(?:480|1200)|logo-[0-9a-f-]{36})$/;
const IMG_PREFIX = '/img/';

export const imagesRoutes = new Hono<{ Bindings: Env }>();

imagesRoutes.get('/img/*', async (c) => {
  const key = c.req.path.slice(IMG_PREFIX.length);

  if (!IMAGE_KEY_PATTERN.test(key)) {
    throw new ApiError(404, 'NOT_FOUND', 'No encontrado');
  }

  const store = createImageStore(c.env);
  const result = await store.get(key);

  if (!result) {
    throw new ApiError(404, 'NOT_FOUND', 'No encontrado');
  }

  return new Response(result.body, {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
