import { isPubliclyVisible } from '../../shared/domain/visibility';
import { ApiError } from '../lib/errors';
import { findActiveTenantStmt } from '../repositories/tenants.repo';
import { listCategoriesStmt } from '../repositories/categories.repo';
import { listPublicProductsStmt } from '../repositories/products.repo';
import {
  parseCategoryRow,
  parseProductRow,
  toPublicCategory,
  toPublicProduct,
} from './product-mappers';
import type { CategoryRow, ProductRow, TenantRow } from '../repositories/row.types';
import type {
  PublicCatalogResponse,
  PublicProduct,
  PublicTenant,
} from '../../shared/types/api.types';
import type { Currency } from '../../shared/types/tenant.types';

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

  const categories = (categoriesResult.results as CategoryRow[]).map(parseCategoryRow);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const productRows = productsResult.results as ProductRow[];

  const products = productRows
    .map(parseProductRow)
    .map((product) => {
      const category = categoryById.get(product.categoryId);

      if (!category) {
        return null;
      }

      const visible = isPubliclyVisible(
        {
          status: product.status,
          stockMode: product.stockMode,
          stockQty: product.stockQty,
          choices: product.choices,
        },
        { choiceLabel: category.choiceLabel },
      );

      return visible ? toPublicProduct(product, category.key) : null;
    })
    .filter((product): product is PublicProduct => product !== null);

  return {
    tenant: toPublicTenant(tenantRow),
    categories: categories.map(toPublicCategory),
    products,
  };
}
