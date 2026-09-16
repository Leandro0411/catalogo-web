import type { AdminUserRow } from './row.types';

export async function findAdminByUsername(
  db: D1Database,
  username: string,
): Promise<AdminUserRow | null> {
  const row = await db
    .prepare('SELECT * FROM admin_users WHERE username = ?')
    .bind(username)
    .first<AdminUserRow>();

  return row ?? null;
}

export async function registerFailedAttempt(
  db: D1Database,
  id: string,
  failedAttempts: number,
  lockedUntil: string | null,
): Promise<void> {
  await db
    .prepare(
      `UPDATE admin_users SET failed_attempts = ?, locked_until = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(failedAttempts, lockedUntil, id)
    .run();
}

export async function resetAttempts(db: D1Database, id: string): Promise<void> {
  await db
    .prepare(
      `UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(id)
    .run();
}
