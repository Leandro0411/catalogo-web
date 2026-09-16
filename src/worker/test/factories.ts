import { newId } from '../lib/ids';
import type { CategoryRow, ProductRow, TenantRow } from '../repositories/row.types';

export async function resetCatalogTables(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM products'),
    db.prepare('DELETE FROM categories'),
    db.prepare('DELETE FROM tenants'),
  ]);
}

export async function insertTenant(
  db: D1Database,
  overrides: Partial<TenantRow> = {},
): Promise<TenantRow> {
  const now = new Date().toISOString();
  const row: TenantRow = {
    id: newId(),
    slug: 'banned',
    name: 'BANNED',
    logo_key: null,
    primary_color: '#111111',
    whatsapp: '5490000000000',
    currency: 'ARS',
    age_gate: 1,
    noindex: 1,
    is_active: 1,
    created_at: now,
    updated_at: now,
    ...overrides,
  };

  await db
    .prepare(
      `INSERT INTO tenants
        (id, slug, name, logo_key, primary_color, whatsapp, currency, age_gate, noindex, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.slug,
      row.name,
      row.logo_key,
      row.primary_color,
      row.whatsapp,
      row.currency,
      row.age_gate,
      row.noindex,
      row.is_active,
      row.created_at,
      row.updated_at,
    )
    .run();

  return row;
}

export async function insertCategory(
  db: D1Database,
  tenantId: string,
  overrides: Partial<Omit<CategoryRow, 'id' | 'tenant_id'>> = {},
): Promise<CategoryRow> {
  const row: CategoryRow = {
    id: newId(),
    tenant_id: tenantId,
    key: 'vapes',
    name: 'Vapes',
    sort_order: 0,
    attribute_schema: JSON.stringify([
      { key: 'puffs', label: 'Puffs', type: 'number', unit: 'puffs' },
    ]),
    choice_label: 'Sabor',
    default_stock_mode: 'availability',
    default_currency: 'ARS',
    ...overrides,
  };

  await db
    .prepare(
      `INSERT INTO categories
        (id, tenant_id, key, name, sort_order, attribute_schema, choice_label, default_stock_mode, default_currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.tenant_id,
      row.key,
      row.name,
      row.sort_order,
      row.attribute_schema,
      row.choice_label,
      row.default_stock_mode,
      row.default_currency,
    )
    .run();

  return row;
}

export async function insertProduct(
  db: D1Database,
  tenantId: string,
  categoryId: string,
  overrides: Partial<Omit<ProductRow, 'id' | 'tenant_id' | 'category_id'>> = {},
): Promise<ProductRow> {
  const now = new Date().toISOString();
  const row: ProductRow = {
    id: newId(),
    tenant_id: tenantId,
    category_id: categoryId,
    name: 'THE BLACK SHEEP',
    description: null,
    image_key: null,
    price_cents: 2600000,
    currency: 'ARS',
    price_note: null,
    stock_mode: 'availability',
    stock_qty: null,
    status: 'active',
    attributes: JSON.stringify({ puffs: 30000 }),
    choices: JSON.stringify([{ value: 'Grape / Strawberry Kiwi 🍇🍓🥝', available: true }]),
    sort_order: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };

  await db
    .prepare(
      `INSERT INTO products
        (id, tenant_id, category_id, name, description, image_key, price_cents, currency, price_note, stock_mode, stock_qty, status, attributes, choices, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.tenant_id,
      row.category_id,
      row.name,
      row.description,
      row.image_key,
      row.price_cents,
      row.currency,
      row.price_note,
      row.stock_mode,
      row.stock_qty,
      row.status,
      row.attributes,
      row.choices,
      row.sort_order,
      row.created_at,
      row.updated_at,
    )
    .run();

  return row;
}
