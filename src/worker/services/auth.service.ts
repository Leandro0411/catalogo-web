import { ApiError } from '../lib/errors';
import { LOGIN_LOCK_MINUTES, LOGIN_MAX_ATTEMPTS, SESSION_TTL_DAYS } from '../lib/constants';
import { addDays, addMinutes, fromSqlDateTime, toSqlDateTime } from '../lib/dates';
import { randomToken, sha256Hex } from '../lib/crypto';
import {
  findAdminByUsername,
  registerFailedAttempt,
  resetAttempts,
} from '../repositories/admins.repo';
import {
  deleteExpiredSessions,
  deleteSession,
  findSessionWithAdmin,
  insertSession,
} from '../repositories/sessions.repo';
import { verifyPassword } from '../../shared/crypto/password';
import type { AdminContext } from '../lib/hono-env.types';
import type { Currency } from '../../shared/types/tenant.types';

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  expiresAt: Date;
}

function accountLockedError(lockedUntil: Date, now: Date): ApiError {
  const retryAfterSeconds = Math.max(0, Math.round((lockedUntil.getTime() - now.getTime()) / 1000));
  return new ApiError(
    423,
    'ACCOUNT_LOCKED',
    'Demasiados intentos. Probá de nuevo en unos minutos.',
    {
      retryAfterSeconds,
    },
  );
}

export async function login(db: D1Database, input: LoginInput, now: Date): Promise<LoginResult> {
  const admin = await findAdminByUsername(db, input.username);

  if (!admin) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos');
  }

  const nowSql = toSqlDateTime(now);

  if (admin.locked_until && admin.locked_until > nowSql) {
    throw accountLockedError(fromSqlDateTime(admin.locked_until), now);
  }

  const passwordOk = await verifyPassword(input.password, admin.password_hash);

  if (!passwordOk) {
    const failedAttempts = admin.failed_attempts + 1;

    if (failedAttempts >= LOGIN_MAX_ATTEMPTS) {
      const lockedUntil = addMinutes(now, LOGIN_LOCK_MINUTES);
      await registerFailedAttempt(db, admin.id, 0, toSqlDateTime(lockedUntil));
      throw accountLockedError(lockedUntil, now);
    }

    await registerFailedAttempt(db, admin.id, failedAttempts, null);
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos');
  }

  await resetAttempts(db, admin.id);

  const token = randomToken();
  const sessionId = await sha256Hex(token);
  const expiresAt = addDays(now, SESSION_TTL_DAYS);

  await insertSession(db, {
    id: sessionId,
    adminUserId: admin.id,
    tenantId: admin.tenant_id,
    expiresAt: toSqlDateTime(expiresAt),
  });

  await deleteExpiredSessions(db, nowSql);

  return { token, expiresAt };
}

export async function logout(db: D1Database, token: string): Promise<void> {
  const sessionId = await sha256Hex(token);
  await deleteSession(db, sessionId);
}

export async function getAdminContext(
  db: D1Database,
  token: string,
  now: Date,
): Promise<AdminContext | null> {
  const sessionId = await sha256Hex(token);
  const row = await findSessionWithAdmin(db, sessionId);

  if (!row) {
    return null;
  }

  if (row.expires_at <= toSqlDateTime(now)) {
    await deleteSession(db, sessionId);
    return null;
  }

  return {
    adminUserId: row.admin_user_id,
    tenantId: row.tenant_id,
    username: row.username,
    tenantSlug: row.tenant_slug,
    tenantName: row.tenant_name,
    primaryColor: row.primary_color,
    logoUrl: row.logo_key ? `/img/${row.logo_key}` : null,
    currency: row.currency as Currency,
  };
}
