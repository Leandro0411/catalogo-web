import type { TenantRow } from './row.types';

export async function findActiveTenantBySlug(
  db: D1Database,
  slug: string,
): Promise<TenantRow | null> {
  const row = await db
    .prepare('SELECT * FROM tenants WHERE slug = ? AND is_active = 1')
    .bind(slug)
    .first<TenantRow>();

  return row ?? null;
}

export function findActiveTenantStmt(db: D1Database, slug: string): D1PreparedStatement {
  return db.prepare('SELECT * FROM tenants WHERE slug = ? AND is_active = 1').bind(slug);
}
