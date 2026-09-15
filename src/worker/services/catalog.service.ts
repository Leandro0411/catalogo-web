import { ApiError } from '../lib/errors';
import { findActiveTenantBySlug } from '../repositories/tenants.repo';
import type { TenantRow } from '../repositories/row.types';
import type { PublicCatalogResponse, PublicTenant } from '../../shared/types/api.types';
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
  const tenantRow = await findActiveTenantBySlug(db, slug);

  if (!tenantRow) {
    throw new ApiError(404, 'TENANT_NOT_FOUND', 'Catálogo no encontrado');
  }

  return {
    tenant: toPublicTenant(tenantRow),
    categories: [],
    products: [],
  };
}
