import { ApiError } from '../lib/errors';
import { newId } from '../lib/ids';
import { validateAttributes } from '../../shared/domain/attributes';
import { findCategoryForTenant, listCategoriesByTenant } from '../repositories/categories.repo';
import {
  deleteProductForTenant,
  findProductForTenant,
  insertProduct,
  listProductsByTenant,
  updateProduct as updateProductRow,
  updateProductStatus as updateProductStatusRow,
} from '../repositories/products.repo';
import {
  parseCategoryRow,
  parseProductRow,
  toAdminCategory,
  toAdminProduct,
} from './product-mappers';
import type { ProductRow } from '../repositories/row.types';
import type { AdminCategory, AdminProduct, ProductInput } from '../../shared/types/api.types';
import type { ProductStatus } from '../../shared/types/catalog.types';

export interface AdminProductsList {
  categories: AdminCategory[];
  products: AdminProduct[];
}

export interface UpdateProductResult {
  product: AdminProduct;
  previousImageKey: string | null;
}

function validateProductInput(
  category: ReturnType<typeof parseCategoryRow>,
  tenantId: string,
  input: ProductInput,
): Record<string, string | number> {
  const attributesResult = validateAttributes(category.attributeSchema, input.attributes);

  if (!attributesResult.ok) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Revisá los datos', {
      attributes: attributesResult.errors,
    });
  }

  if (!category.choiceLabel && input.choices.length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Revisá los datos', {
      choices: 'Esta categoría no admite opciones',
    });
  }

  if (input.imageKey && !input.imageKey.startsWith(`t/${tenantId}/`)) {
    throw new ApiError(400, 'INVALID_IMAGE', 'Imagen inválida');
  }

  return attributesResult.value;
}

export async function listProducts(db: D1Database, tenantId: string): Promise<AdminProductsList> {
  const [categoryRows, productRows] = await Promise.all([
    listCategoriesByTenant(db, tenantId),
    listProductsByTenant(db, tenantId),
  ]);

  const categories = categoryRows.map(parseCategoryRow);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const products = productRows
    .map(parseProductRow)
    .map((product) => {
      const category = categoryById.get(product.categoryId);
      return category ? toAdminProduct(product, category) : null;
    })
    .filter((product): product is AdminProduct => product !== null);

  return { categories: categories.map(toAdminCategory), products };
}

export async function getProduct(
  db: D1Database,
  tenantId: string,
  id: string,
): Promise<AdminProduct> {
  const productRow = await findProductForTenant(db, tenantId, id);

  if (!productRow) {
    throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Producto no encontrado');
  }

  const product = parseProductRow(productRow);
  const categoryRow = await findCategoryForTenant(db, tenantId, product.categoryId);

  if (!categoryRow) {
    throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Producto no encontrado');
  }

  return toAdminProduct(product, parseCategoryRow(categoryRow));
}

export async function createProduct(
  db: D1Database,
  tenantId: string,
  input: ProductInput,
): Promise<AdminProduct> {
  const categoryRow = await findCategoryForTenant(db, tenantId, input.categoryId);

  if (!categoryRow) {
    throw new ApiError(400, 'INVALID_CATEGORY', 'La categoría no existe');
  }

  const category = parseCategoryRow(categoryRow);
  const attributes = validateProductInput(category, tenantId, input);

  const now = new Date().toISOString();
  const row: ProductRow = {
    id: newId(),
    tenant_id: tenantId,
    category_id: input.categoryId,
    name: input.name,
    description: input.description,
    image_key: input.imageKey,
    price_cents: input.priceCents,
    currency: input.currency,
    price_note: input.priceNote,
    stock_mode: input.stockMode,
    stock_qty: input.stockQty,
    status: input.status,
    attributes: JSON.stringify(attributes),
    choices: JSON.stringify(input.choices),
    sort_order: 0,
    created_at: now,
    updated_at: now,
  };

  await insertProduct(db, row);

  return toAdminProduct(parseProductRow(row), category);
}

export async function updateProduct(
  db: D1Database,
  tenantId: string,
  id: string,
  input: ProductInput,
): Promise<UpdateProductResult> {
  const existingRow = await findProductForTenant(db, tenantId, id);

  if (!existingRow) {
    throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Producto no encontrado');
  }

  const categoryRow = await findCategoryForTenant(db, tenantId, input.categoryId);

  if (!categoryRow) {
    throw new ApiError(400, 'INVALID_CATEGORY', 'La categoría no existe');
  }

  const category = parseCategoryRow(categoryRow);
  const attributes = validateProductInput(category, tenantId, input);

  const updatedRow: ProductRow = {
    ...existingRow,
    category_id: input.categoryId,
    name: input.name,
    description: input.description,
    image_key: input.imageKey,
    price_cents: input.priceCents,
    currency: input.currency,
    price_note: input.priceNote,
    stock_mode: input.stockMode,
    stock_qty: input.stockQty,
    status: input.status,
    attributes: JSON.stringify(attributes),
    choices: JSON.stringify(input.choices),
    updated_at: new Date().toISOString(),
  };

  await updateProductRow(db, tenantId, updatedRow);

  return {
    product: toAdminProduct(parseProductRow(updatedRow), category),
    previousImageKey: existingRow.image_key,
  };
}

export async function setProductStatus(
  db: D1Database,
  tenantId: string,
  id: string,
  status: ProductStatus,
): Promise<AdminProduct> {
  const existingRow = await findProductForTenant(db, tenantId, id);

  if (!existingRow) {
    throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Producto no encontrado');
  }

  if (status === 'sold' && existingRow.stock_mode !== 'unit') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Revisá los datos', {
      status: 'El estado "sold" solo aplica a stockMode unit',
    });
  }

  const categoryRow = await findCategoryForTenant(db, tenantId, existingRow.category_id);

  if (!categoryRow) {
    throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Producto no encontrado');
  }

  await updateProductStatusRow(db, tenantId, id, status);

  const updatedRow: ProductRow = { ...existingRow, status, updated_at: new Date().toISOString() };

  return toAdminProduct(parseProductRow(updatedRow), parseCategoryRow(categoryRow));
}

export async function deleteProduct(
  db: D1Database,
  tenantId: string,
  id: string,
): Promise<string | null> {
  const existingRow = await findProductForTenant(db, tenantId, id);

  if (!existingRow) {
    throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Producto no encontrado');
  }

  await deleteProductForTenant(db, tenantId, id);

  return existingRow.image_key;
}
