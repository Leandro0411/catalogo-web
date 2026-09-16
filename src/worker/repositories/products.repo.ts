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
