import type { CategoryRow } from './row.types';

export function listCategoriesStmt(db: D1Database, slug: string): D1PreparedStatement {
  return db
    .prepare(
      `SELECT * FROM categories
       WHERE tenant_id = (SELECT id FROM tenants WHERE slug = ? AND is_active = 1)
       ORDER BY sort_order, name`,
    )
    .bind(slug);
}

export async function listCategoriesByTenant(
  db: D1Database,
  tenantId: string,
): Promise<CategoryRow[]> {
  const result = await db
    .prepare('SELECT * FROM categories WHERE tenant_id = ? ORDER BY sort_order, name')
    .bind(tenantId)
    .all<CategoryRow>();

  return result.results;
}
