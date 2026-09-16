import { sqlValue } from './sql';

interface AdminInsertInput {
  id: string;
  tenantSlug: string;
  username: string;
  passwordHash: string;
}

export function buildAdminInsertSql({
  id,
  tenantSlug,
  username,
  passwordHash,
}: AdminInsertInput): string {
  const tenantIdSubquery = `(SELECT id FROM tenants WHERE slug = ${sqlValue(tenantSlug)})`;

  return `INSERT INTO admin_users (id, tenant_id, username, password_hash)
VALUES (${sqlValue(id)}, ${tenantIdSubquery}, ${sqlValue(username)}, ${sqlValue(passwordHash)});`;
}

export function buildPasswordResetSql(username: string, passwordHash: string): string {
  const adminIdSubquery = `(SELECT id FROM admin_users WHERE username = ${sqlValue(username)})`;

  return [
    `DELETE FROM sessions WHERE admin_user_id = ${adminIdSubquery};`,
    `UPDATE admin_users SET password_hash = ${sqlValue(passwordHash)}, failed_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE username = ${sqlValue(username)};`,
  ].join('\n');
}
