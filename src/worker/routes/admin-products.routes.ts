import { Hono } from 'hono';
import { requireAdmin } from '../middleware/require-admin';
import { sameOrigin } from '../middleware/same-origin';
import { productInputSchema, statusInputSchema } from '../../shared/schemas/product.schema';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  setProductStatus,
  updateProduct,
} from '../services/products.service';
import { deleteProductImageIfUnreferenced } from '../services/images/images.service';
import { createImageStore } from '../services/images/kv-image-store';
import type { AppEnv } from '../lib/hono-env.types';

export const adminProductsRoutes = new Hono<AppEnv>();

adminProductsRoutes.use('*', requireAdmin);

adminProductsRoutes.get('/categories', async (c) => {
  const admin = c.get('admin');
  const { categories } = await listProducts(c.env.DB, admin.tenantId);
  return c.json(categories);
});

adminProductsRoutes.get('/products', async (c) => {
  const admin = c.get('admin');
  const { products } = await listProducts(c.env.DB, admin.tenantId);
  return c.json(products);
});

adminProductsRoutes.get('/products/:id', async (c) => {
  const admin = c.get('admin');
  const product = await getProduct(c.env.DB, admin.tenantId, c.req.param('id'));
  return c.json(product);
});

adminProductsRoutes.post('/products', sameOrigin, async (c) => {
  const admin = c.get('admin');
  const input = productInputSchema.parse(await c.req.json());
  const product = await createProduct(c.env.DB, admin.tenantId, input);
  return c.json(product, 201);
});

adminProductsRoutes.put('/products/:id', sameOrigin, async (c) => {
  const admin = c.get('admin');
  const input = productInputSchema.parse(await c.req.json());
  const { product, previousImageKey } = await updateProduct(
    c.env.DB,
    admin.tenantId,
    c.req.param('id'),
    input,
  );

  if (previousImageKey && previousImageKey !== product.imageKey) {
    const store = createImageStore(c.env);
    c.executionCtx.waitUntil(
      deleteProductImageIfUnreferenced(c.env.DB, store, admin.tenantId, previousImageKey),
    );
  }

  return c.json(product);
});

adminProductsRoutes.patch('/products/:id/status', sameOrigin, async (c) => {
  const admin = c.get('admin');
  const { status } = statusInputSchema.parse(await c.req.json());
  const product = await setProductStatus(c.env.DB, admin.tenantId, c.req.param('id'), status);
  return c.json(product);
});

adminProductsRoutes.delete('/products/:id', sameOrigin, async (c) => {
  const admin = c.get('admin');
  const imageKey = await deleteProduct(c.env.DB, admin.tenantId, c.req.param('id'));

  if (imageKey) {
    const store = createImageStore(c.env);
    c.executionCtx.waitUntil(
      deleteProductImageIfUnreferenced(c.env.DB, store, admin.tenantId, imageKey),
    );
  }

  return c.body(null, 204);
});
