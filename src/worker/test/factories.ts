import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { hashPassword } from '../../shared/crypto/password';
import { newId } from '../lib/ids';
import worker from '../index';
import type { AdminUserRow, CategoryRow, ProductRow, TenantRow } from '../repositories/row.types';

export async function resetCatalogTables(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM sessions'),
    db.prepare('DELETE FROM admin_users'),
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

export async function insertAdmin(
  db: D1Database,
  input: { tenantId: string; username: string; password: string },
): Promise<AdminUserRow> {
  const passwordHash = await hashPassword(input.password);
  const now = new Date().toISOString();
  const row: AdminUserRow = {
    id: newId(),
    tenant_id: input.tenantId,
    username: input.username,
    password_hash: passwordHash,
    failed_attempts: 0,
    locked_until: null,
    created_at: now,
    updated_at: now,
  };

  await db
    .prepare(
      `INSERT INTO admin_users
        (id, tenant_id, username, password_hash, failed_attempts, locked_until, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.tenant_id,
      row.username,
      row.password_hash,
      row.failed_attempts,
      row.locked_until,
      row.created_at,
      row.updated_at,
    )
    .run();

  return row;
}

const LOCAL_ORIGIN_HEADERS = { Origin: 'http://localhost', Host: 'localhost' };

export async function loginAs(username: string, password: string): Promise<string> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(
    new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...LOCAL_ORIGIN_HEADERS },
      body: JSON.stringify({ username, password }),
    }),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);

  const setCookie = response.headers.get('Set-Cookie') ?? '';
  return setCookie.split(';')[0] ?? '';
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
