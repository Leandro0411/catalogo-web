import type { Choice, ProductStatus, StockMode } from '../../src/shared/types/catalog.types';
import type { Currency } from '../../src/shared/types/tenant.types';
import { sqlJson, sqlValue } from './sql';

export interface DevProductFixture {
  tenantSlug: string;
  categoryKey: string;
  name: string;
  priceCents: number;
  currency: Currency;
  priceNote?: string | null;
  stockMode: StockMode;
  stockQty?: number | null;
  status: ProductStatus;
  attributes: Record<string, string | number>;
  choices: Choice[];
}

export function buildProductInsertSql(fixture: DevProductFixture, id: string): string {
  const tenantIdSubquery = `(SELECT id FROM tenants WHERE slug = ${sqlValue(fixture.tenantSlug)})`;
  const categoryIdSubquery = `(SELECT id FROM categories WHERE tenant_id = ${tenantIdSubquery} AND key = ${sqlValue(fixture.categoryKey)})`;

  const columns = [
    'id',
    'tenant_id',
    'category_id',
    'name',
    'price_cents',
    'currency',
    'price_note',
    'stock_mode',
    'stock_qty',
    'status',
    'attributes',
    'choices',
  ];
  const values = [
    sqlValue(id),
    tenantIdSubquery,
    categoryIdSubquery,
    sqlValue(fixture.name),
    sqlValue(fixture.priceCents),
    sqlValue(fixture.currency),
    sqlValue(fixture.priceNote ?? null),
    sqlValue(fixture.stockMode),
    sqlValue(fixture.stockQty ?? null),
    sqlValue(fixture.status),
    sqlJson(fixture.attributes),
    sqlJson(fixture.choices),
  ];

  return `INSERT INTO products (${columns.join(', ')}) VALUES (${values.join(', ')});`;
}
