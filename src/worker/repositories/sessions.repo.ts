export interface SessionWithAdminRow {
  session_id: string;
  admin_user_id: string;
  expires_at: string;
  tenant_id: string;
  username: string;
  tenant_slug: string;
  tenant_name: string;
  primary_color: string;
  currency: string;
  logo_key: string | null;
}

export async function insertSession(
  db: D1Database,
  session: { id: string; adminUserId: string; tenantId: string; expiresAt: string },
): Promise<void> {
  await db
    .prepare('INSERT INTO sessions (id, admin_user_id, tenant_id, expires_at) VALUES (?, ?, ?, ?)')
    .bind(session.id, session.adminUserId, session.tenantId, session.expiresAt)
    .run();
}

export async function findSessionWithAdmin(
  db: D1Database,
  sessionId: string,
): Promise<SessionWithAdminRow | null> {
  const row = await db
    .prepare(
      `SELECT
         s.id AS session_id,
         s.admin_user_id AS admin_user_id,
         s.expires_at AS expires_at,
         t.id AS tenant_id,
         a.username AS username,
         t.slug AS tenant_slug,
         t.name AS tenant_name,
         t.primary_color AS primary_color,
         t.currency AS currency,
         t.logo_key AS logo_key
       FROM sessions s
       JOIN admin_users a ON a.id = s.admin_user_id
       JOIN tenants t ON t.id = s.tenant_id
       WHERE s.id = ? AND t.is_active = 1`,
    )
    .bind(sessionId)
    .first<SessionWithAdminRow>();

  return row ?? null;
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

export async function deleteExpiredSessions(db: D1Database, now: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now).run();
}
