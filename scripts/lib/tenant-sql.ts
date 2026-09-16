import type { TenantConfig } from '../../src/shared/types/tenant.types';
import { buildCategoryUpsertSql } from './category-sql';
import { sqlValue } from './sql';

export function buildTenantUpsertSql(config: TenantConfig, id: string): string {
  const columns = [
    'id',
    'slug',
    'name',
    'primary_color',
    'whatsapp',
    'currency',
    'age_gate',
    'noindex',
    'is_active',
  ];
  const values = [
    sqlValue(id),
    sqlValue(config.slug),
    sqlValue(config.name),
    sqlValue(config.primaryColor),
    sqlValue(config.whatsapp),
    sqlValue(config.currency),
    sqlValue(config.ageGate),
    sqlValue(config.noindex),
    sqlValue(config.isActive),
  ];

  return `INSERT INTO tenants (${columns.join(', ')}) VALUES (${values.join(', ')})
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  primary_color = excluded.primary_color,
  whatsapp = excluded.whatsapp,
  currency = excluded.currency,
  age_gate = excluded.age_gate,
  noindex = excluded.noindex,
  is_active = excluded.is_active,
  updated_at = datetime('now');`;
}

export function buildTenantWithCategoriesSql(config: TenantConfig, tenantId: string): string {
  const statements = [buildTenantUpsertSql(config, tenantId)];

  for (const category of config.categories) {
    statements.push(buildCategoryUpsertSql(config.slug, category, crypto.randomUUID()));
  }

  return statements.join('\n');
}
