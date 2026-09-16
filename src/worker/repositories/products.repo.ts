import type { ProductRow } from './row.types';
import type { ProductStatus } from '../../shared/types/catalog.types';

export function listPublicProductsStmt(db: D1Database, slug: string): D1PreparedStatement {
  return db
    .prepare(
      `SELECT * FROM products
       WHERE tenant_id = (SELECT id FROM tenants WHERE slug = ? AND is_active = 1)
         AND status = 'active'
         AND (stock_mode <> 'quantity' OR stock_qty > 0)
       ORDER BY sort_order, name`,
    )
    .bind(slug);
}

export async function listProductsByTenant(
  db: D1Database,
  tenantId: string,
): Promise<ProductRow[]> {
  const result = await db
    .prepare(
      `SELECT p.* FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.tenant_id = ?
       ORDER BY c.sort_order, p.sort_order, p.name`,
    )
    .bind(tenantId)
    .all<ProductRow>();

  return result.results;
}

export async function findProductForTenant(
  db: D1Database,
  tenantId: string,
  id: string,
): Promise<ProductRow | null> {
  const row = await db
    .prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<ProductRow>();

  return row ?? null;
}

export async function insertProduct(db: D1Database, row: ProductRow): Promise<void> {
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
}

export async function updateProduct(
  db: D1Database,
  tenantId: string,
  row: ProductRow,
): Promise<void> {
  await db
    .prepare(
      `UPDATE products SET
        category_id = ?, name = ?, description = ?, image_key = ?, price_cents = ?, currency = ?,
        price_note = ?, stock_mode = ?, stock_qty = ?, status = ?, attributes = ?, choices = ?,
        updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
    )
    .bind(
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
      row.updated_at,
      row.id,
      tenantId,
    )
    .run();
}

export async function updateProductStatus(
  db: D1Database,
  tenantId: string,
  id: string,
  status: ProductStatus,
): Promise<void> {
  await db
    .prepare(
      `UPDATE products SET status = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`,
    )
    .bind(status, id, tenantId)
    .run();
}

export async function countProductsByImageKey(
  db: D1Database,
  tenantId: string,
  imageKey: string,
): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS count FROM products WHERE tenant_id = ? AND image_key = ?')
    .bind(tenantId, imageKey)
    .first<{ count: number }>();

  return row?.count ?? 0;
}

export async function deleteProductForTenant(
  db: D1Database,
  tenantId: string,
  id: string,
): Promise<void> {
  await db.prepare('DELETE FROM products WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();
}
