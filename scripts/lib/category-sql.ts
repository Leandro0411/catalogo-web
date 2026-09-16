import type { CategoryConfig } from '../../src/shared/types/catalog.types';
import { sqlJson, sqlValue } from './sql';

export function buildCategoryUpsertSql(
  tenantSlug: string,
  category: CategoryConfig,
  id: string,
): string {
  const tenantIdSubquery = `(SELECT id FROM tenants WHERE slug = ${sqlValue(tenantSlug)})`;

  const columns = [
    'id',
    'tenant_id',
    'key',
    'name',
    'sort_order',
    'attribute_schema',
    'choice_label',
    'default_stock_mode',
    'default_currency',
  ];
  const values = [
    sqlValue(id),
    tenantIdSubquery,
    sqlValue(category.key),
    sqlValue(category.name),
    sqlValue(category.sortOrder),
    sqlJson(category.attributeSchema),
    sqlValue(category.choiceLabel),
    sqlValue(category.defaultStockMode),
    sqlValue(category.defaultCurrency),
  ];

  return `INSERT INTO categories (${columns.join(', ')}) VALUES (${values.join(', ')})
ON CONFLICT(tenant_id, key) DO UPDATE SET
  name = excluded.name,
  sort_order = excluded.sort_order,
  attribute_schema = excluded.attribute_schema,
  choice_label = excluded.choice_label,
  default_stock_mode = excluded.default_stock_mode,
  default_currency = excluded.default_currency;`;
}
