import { newId } from '../lib/ids';
import type { TenantRow } from '../repositories/row.types';

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
