import { describe, expect, it } from 'vitest';
import { buildAdminInsertSql, buildPasswordResetSql } from './admin-sql';

describe('buildAdminInsertSql', () => {
  it('resuelve tenant_id por slug', () => {
    const sql = buildAdminInsertSql({
      id: 'a1',
      tenantSlug: 'banned',
      username: 'leandro',
      passwordHash: 'hash',
    });

    expect(sql).toContain('INSERT INTO admin_users');
    expect(sql).toContain("(SELECT id FROM tenants WHERE slug = 'banned')");
    expect(sql).toContain("'leandro'");
  });
});

describe('buildPasswordResetSql', () => {
  it('actualiza el hash, resetea intentos y borra las sesiones', () => {
    const sql = buildPasswordResetSql('leandro', 'nuevo-hash');

    expect(sql).toContain('DELETE FROM sessions WHERE admin_user_id =');
    expect(sql).toContain('failed_attempts = 0');
    expect(sql).toContain('locked_until = NULL');
    expect(sql).toContain("'nuevo-hash'");
  });
});
