import { z } from 'zod';
import { attributeDefSchema, choiceSchema } from '../../shared/schemas/catalog.schema';
import { isPubliclyVisible } from '../../shared/domain/visibility';
import { ApiError } from '../lib/errors';
import { parseJsonColumn } from '../lib/json';
import { findActiveTenantStmt } from '../repositories/tenants.repo';
import { listCategoriesStmt } from '../repositories/categories.repo';
import { listPublicProductsStmt } from '../repositories/products.repo';
import type { CategoryRow, ProductRow, TenantRow } from '../repositories/row.types';
import type {
  PublicCatalogResponse,
  PublicCategory,
  PublicProduct,
  PublicTenant,
} from '../../shared/types/api.types';
import type { Choice, ProductStatus, StockMode } from '../../shared/types/catalog.types';
import type { Currency } from '../../shared/types/tenant.types';

const attributeSchemaArraySchema = z.array(attributeDefSchema);
const choicesArraySchema = z.array(choiceSchema);
const attributesRecordSchema = z.record(z.string(), z.union([z.string(), z.number()]));

function toPublicTenant(row: TenantRow): PublicTenant {
  return {
    slug: row.slug,
    name: row.name,
    logoUrl: row.logo_key ? `/img/${row.logo_key}` : null,
    primaryColor: row.primary_color,
    whatsapp: row.whatsapp,
    currency: row.currency as Currency,
    ageGate: row.age_gate === 1,
  };
}

function toPublicCategory(row: CategoryRow): PublicCategory {
  return {
    key: row.key,
    name: row.name,
    sortOrder: row.sort_order,
    attributeSchema: parseJsonColumn(row.attribute_schema, attributeSchemaArraySchema, []),
    choiceLabel: row.choice_label,
  };
}

function toPublicProduct(row: ProductRow, category: CategoryRow, choices: Choice[]): PublicProduct {
  return {
    id: row.id,
    categoryKey: category.key,
    name: row.name,
    description: row.description,
    image: row.image_key
      ? { thumb: `/img/${row.image_key}-480`, full: `/img/${row.image_key}-1200` }
      : null,
    priceCents: row.price_cents,
    currency: row.currency as Currency,
    priceNote: row.price_note,
    stockMode: row.stock_mode as StockMode,
    stockQty: row.stock_qty,
    attributes: parseJsonColumn(row.attributes, attributesRecordSchema, {}),
    choices: choices.filter((choice) => choice.available).map((choice) => choice.value),
  };
}

export async function getPublicCatalog(
  db: D1Database,
  slug: string,
): Promise<PublicCatalogResponse> {
  const [tenantResult, categoriesResult, productsResult] = await db.batch([
    findActiveTenantStmt(db, slug),
    listCategoriesStmt(db, slug),
    listPublicProductsStmt(db, slug),
  ]);

  const tenantRow = (tenantResult.results as TenantRow[])[0];

  if (!tenantRow) {
    throw new ApiError(404, 'TENANT_NOT_FOUND', 'Catálogo no encontrado');
  }

  const categoryRows = categoriesResult.results as CategoryRow[];
  const productRows = productsResult.results as ProductRow[];
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));

  const products: PublicProduct[] = [];

  for (const product of productRows) {
    const category = categoryById.get(product.category_id);
    if (!category) {
      continue;
    }

    const choices = parseJsonColumn(product.choices, choicesArraySchema, []);
    const visible = isPubliclyVisible(
      {
        status: product.status as ProductStatus,
        stockMode: product.stock_mode as StockMode,
        stockQty: product.stock_qty,
        choices,
      },
      { choiceLabel: category.choice_label },
    );

    if (visible) {
      products.push(toPublicProduct(product, category, choices));
    }
  }

  return {
    tenant: toPublicTenant(tenantRow),
    categories: categoryRows.map(toPublicCategory),
    products,
  };
}
