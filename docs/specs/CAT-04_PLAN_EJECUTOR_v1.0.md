# Plan de Ejecución — CAT-04 Acceso admin con usuario y contraseña

## Metadatos

- **ID:** CAT-04 (fase A, 4 de 11)
- **Versión:** v1.0
- **Fecha:** 2026-09-14
- **Origen:** `docs/specs/CATALOGO_ARQUITECTO_v1.0.md` (D14, riesgos R03/R10/R11) y `docs/specs/ARQUITECTURA_DEL_SISTEMA.md` §6.5.
- **Destinatario:** Agente Ejecutor. Documento agnóstico de herramienta.
- **Base de código requerida:** CAT-01 completo e integrado en `main` (no depende de CAT-02/03; si ya están integrados, trabajar sobre ellos). Rama `cat-04-login-admin`.
- **Stack y comandos:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:unit`, `npm run test:worker`, `npm run build`, `npm run db:migrate:local`, `npm run dev`. Este plan agrega el script `admin`.

---

## Misión

Implementar el acceso al panel `/admin` con usuario y contraseña. Incluye: sesión por cookie segura de 30 días, bloqueo de 15 minutos tras 5 intentos fallidos, protección contra peticiones de otros orígenes, un CLI para crear administradores y resetear contraseñas, y un panel que muestra el tenant del usuario logueado.

---

## Guardarraíles (No Negociables)

### Lo que NO se modifica
- `docs/specs/`, migraciones existentes y el endpoint público.

### Convenciones de código a respetar
- Las de CAT-01 y del Mapa §3/§6.
- El `tenant_id` del administrador sale **solo** de la sesión; ningún endpoint de admin acepta `tenantId` del cliente.
- Nunca se loguean ni se devuelven contraseñas, hashes, tokens o cookies. El token de sesión nunca se persiste: se guarda su SHA-256.
- Constantes del Worker en `src/worker/lib/constants.ts`; `PBKDF2_ITERATIONS` en `src/shared/constants.ts`.

### Constraints técnicas
- Hash: PBKDF2-HMAC-SHA256, 100 000 iteraciones (máximo que acepta workerd), sal de 16 bytes, clave de 32 bytes, formato `pbkdf2-sha256$<iter>$<salB64>$<hashB64>`, comparación en tiempo constante. Solo WebCrypto (`crypto.subtle`), válido en Worker y en Node 22.
- Cookie `__Host-cat_session`: con Hono, nombre `cat_session` y `prefix: 'host'`; `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=2592000`.
- Respuestas de `/api/admin/*` con `Cache-Control: no-store`.

---

## Entorno de Ejecución y Verificación

- **Arranque local:**
  ```bash
  npm run db:migrate:local
  npm run tenant -- upsert tenants/banned.json
  npm run admin -- create --tenant banned --username leandro
  npm run dev
  ```
- **Datos de prueba:** factories de tests (`insertAdmin`).
- **Limitación declarada:** el comportamiento del límite de 10 ms de CPU del plan Free solo se observa en producción (se verifica en CAT-07).

---

## Archivos a Crear

1. `migrations/0003_auth.sql`.
2. `src/shared/crypto/password.ts` + `password.test.ts`.
3. `src/shared/schemas/auth.schema.ts` — `loginSchema`, `usernameSchema`.
4. `src/worker/lib/constants.ts`, `src/worker/lib/crypto.ts` (`randomToken`, `sha256Hex`), `src/worker/lib/dates.ts` (`toSqlDateTime`, `addMinutes`, `addDays`), `src/worker/lib/hono-env.types.ts` (`AppEnv`, `AdminContext`).
5. `src/worker/repositories/admins.repo.ts`, `src/worker/repositories/sessions.repo.ts`.
6. `src/worker/services/auth.service.ts`.
7. `src/worker/middleware/require-admin.ts`, `same-origin.ts`, `no-store.ts`.
8. `src/worker/routes/admin-auth.routes.ts` + `admin-auth.routes.test.ts`.
9. `scripts/admin.ts`, `scripts/lib/admin-sql.ts` + `.test.ts`, `scripts/lib/password-gen.ts` + `.test.ts`.
10. `src/web/api/admin.api.ts`.
11. `src/web/features/admin/admin-routes.tsx`, `AdminLayout.tsx`, `admin-context.ts`, `hooks/useSession.ts`.
12. `src/web/features/admin/pages/LoginPage.tsx` + `LoginPage.test.tsx`, `pages/AdminHomePage.tsx`.

## Archivos a Modificar

1. `src/shared/constants.ts` — `PBKDF2_ITERATIONS = 100_000`.
2. `src/shared/types/api.types.ts` — `AdminMeResponse { username; tenant: { slug; name; primaryColor; currency } }`.
3. `src/worker/repositories/row.types.ts` — `AdminUserRow`, `SessionRow`.
4. `src/worker/app.ts` — tipar con `AppEnv`; montar `admin-auth.routes` en `/api/admin`; `noStore` en `/api/admin/*`.
5. `src/worker/test/factories.ts` — `insertAdmin(db, { tenantId, username, password })` y `loginAs(username, password)`, que devuelve el header `Cookie`.
6. `src/web/router.tsx` — rutas `/admin/login` y `/admin` (lazy), declaradas antes de `/:slug`.
7. `package.json` — script `admin`: `tsx scripts/admin.ts`.
8. `README.md` — alta de administradores y reseteo de contraseña.

---

## Tareas (Orden Topológico)

### T01 — Migración de autenticación

**Qué hacer:** crear `migrations/0003_auth.sql`:
```sql
CREATE TABLE admin_users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_admin ON sessions(admin_user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```
Las fechas se guardan como `YYYY-MM-DD HH:MM:SS` UTC (mismo formato que `datetime('now')`) para compararlas como texto.

**Criterio de validación:** `npm run db:migrate:local` aplica 0003 sin errores.

**Depende de:** Ninguna.

### T02 — Hash de contraseñas y CLI de administradores

**Qué hacer:**
1. `password.ts`: `hashPassword(password, iterations = PBKDF2_ITERATIONS)` y `verifyPassword(password, stored)`.
   - `verifyPassword` devuelve `false` (sin lanzar) si el formato es inválido.
   - Codificar en base64 con `btoa`/`atob` (sin `Buffer`).
   - `password.test.ts` empieza con `// @vitest-environment node` (jsdom no implementa `crypto.subtle`).
2. `auth.schema.ts`: `usernameSchema` (recortado, en minúsculas, `^[a-z0-9._-]{3,40}$`); `loginSchema = { username: usernameSchema, password: z.string().min(1).max(200) }`.
3. `password-gen.ts`: `generatePassword(length = 20)` con `crypto.getRandomValues` sobre el alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789`.
4. `admin-sql.ts`:
   - `buildAdminInsertSql({ id, tenantSlug, username, passwordHash })`, con `tenant_id` por subselect de slug;
   - `buildPasswordResetSql(username, passwordHash)`: actualiza el hash, pone `failed_attempts = 0` y `locked_until = NULL`, y borra las sesiones del usuario.
5. `scripts/admin.ts`:
   - `create --tenant <slug> --username <u> [--password <p>] [--remote]`: verifica con `d1Query` que el tenant exista; si no se pasa contraseña, la genera; si se pasa, exige ≥ 12 caracteres. Hashea, ejecuta el SQL e imprime una sola vez: "Contraseña (guardala ahora, no se vuelve a mostrar): …".
   - `reset-password --username <u> [--password <p>] [--remote]`: misma lógica de contraseña.

**Criterio de validación:** `npm run test:unit` pasa:
- `password.test.ts`: formato; verificación correcta e incorrecta; sales distintas producen hashes distintos; hash alterado → `false`;
- `password-gen.test.ts`;
- `admin-sql.test.ts`.

`npm run admin -- create --tenant banned --username leandro` crea el usuario en local.

**Depende de:** T01.

### T03 — Servicio y endpoints de autenticación

**Qué hacer:**
1. `constants.ts` (Worker): `SESSION_COOKIE_NAME = 'cat_session'`, `SESSION_TTL_DAYS = 30`, `LOGIN_MAX_ATTEMPTS = 5`, `LOGIN_LOCK_MINUTES = 15`.
2. `crypto.ts`: `randomToken()` (32 bytes en base64url) y `sha256Hex(text)`. `dates.ts` con helpers de fechas en formato SQL.
3. `admins.repo.ts`: `findAdminByUsername`, `registerFailedAttempt(db, id, failedAttempts, lockedUntil)`, `resetAttempts`. `sessions.repo.ts`:
   - `insertSession`;
   - `findSessionWithAdmin(db, sessionId)`: join con `admin_users` y `tenants` activos, que devuelve los datos para `AdminContext`;
   - `deleteSession`;
   - `deleteExpiredSessions(db, now)`.
4. `auth.service.ts`:
   - `login(db, input, now)`:
     - usuario inexistente → `ApiError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos')`;
     - `locked_until > now` → `ApiError(423, 'ACCOUNT_LOCKED', 'Demasiados intentos. Probá de nuevo en unos minutos.', { retryAfterSeconds })`, sin verificar la contraseña;
     - contraseña incorrecta → incrementa `failed_attempts`; al llegar a 5 pone `locked_until = now + 15 min`, `failed_attempts = 0` y responde 423; si no, 401;
     - éxito → resetea los contadores, crea la sesión (`id = sha256Hex(token)`, vence en 30 días), borra las sesiones vencidas y devuelve `{ token, expiresAt }`.
   - `logout(db, token)`.
   - `getAdminContext(db, token, now)`: sesión vencida → la borra y devuelve `null`.
5. `same-origin.ts`: en métodos distintos de GET/HEAD/OPTIONS exige un header `Origin` cuyo `host` sea igual al header `Host`; si no → `ApiError(403, 'FORBIDDEN_ORIGIN', 'Origen no permitido')`.
6. `require-admin.ts`: lee la cookie (`getCookie(c, SESSION_COOKIE_NAME, 'host')`). Sin cookie o sin sesión válida → borra la cookie y `ApiError(401, 'UNAUTHENTICATED', 'Iniciá sesión')`. Si es válida → `c.set('admin', AdminContext)`, con `{ adminUserId, tenantId, username, tenantSlug, tenantName, primaryColor, currency }`.
7. `no-store.ts`: `Cache-Control: no-store`.
8. `admin-auth.routes.ts`:
   - `POST /login` (sameOrigin, `loginSchema`) → cookie + 204;
   - `POST /logout` (sameOrigin) → borra la sesión si existe y la cookie → 204;
   - `GET /me` (requireAdmin) → `AdminMeResponse`.
9. `app.ts`: tipar con `AppEnv`, aplicar `noStore` a `/api/admin/*` y montar las rutas.

**Criterio de validación:** `npm run test:worker` pasa `admin-auth.routes.test.ts` (ver Tests Obligatorios).

**Depende de:** T02.

### T04 — Panel: login y layout protegido

**Qué hacer:**
1. `admin.api.ts`: `login(username, password)`, `logout()`, `getMe()` sobre `fetchJson`.
2. `useSession.ts`: consulta `/me` y devuelve `{ status: 'loading' | 'authenticated' | 'anonymous', me, refresh }`. `admin-context.ts`: contexto con `me` y `useAdmin()`.
3. `AdminLayout.tsx`:
   - anónimo → `<Navigate to="/admin/login" replace />`;
   - autenticado → header con el nombre del tenant, color de marca (`brandStyle`) y botón "Salir" (logout y navegación al login), más `<Outlet />` dentro del contexto.
4. `LoginPage.tsx`:
   - campos Usuario y Contraseña (`autoComplete="username"` / `"current-password"`, `autoCapitalize="none"`), botón "Ingresar" deshabilitado mientras envía;
   - 401 → "Usuario o contraseña incorrectos"; 423 → "Demasiados intentos. Probá de nuevo en unos minutos."; otro error → "No pudimos conectar. Probá de nuevo.";
   - éxito → navega a `/admin`.
5. `AdminHomePage.tsx`: "Hola, <usuario>" (lo reemplaza CAT-05).
6. `admin-routes.tsx`: rutas `/admin/login` y `/admin` (layout con índice `AdminHomePage`) usando `lazy` de React Router, para que el panel no entre en el bundle público. `router.tsx` las incorpora antes de `/:slug`.

**Criterio de validación:** `npm run test:unit` pasa `LoginPage.test.tsx`; `npm run build` genera un chunk separado para el panel (verificar en la salida de Vite).

**Depende de:** T03.

---

## Tests Obligatorios

### Test AC05 (parcial) — La sesión queda atada al tenant propio
**Dado:** los tenants `banned` y `demo`, cada uno con su admin. **Cuando:** el admin de `banned` hace login y pide `/api/admin/me`. **Entonces:** `tenant.slug = 'banned'`; con la cookie del admin de `demo`, `tenant.slug = 'demo'`.
**Implementación:** `admin-auth.routes.test.ts`.

### Test E08 — Contraseña incorrecta o usuario inexistente
Ambos casos → 401 con el mismo cuerpo (`INVALID_CREDENTIALS`). **Implementación:** `admin-auth.routes.test.ts`.

### Test E09 — Bloqueo tras 5 intentos
Tras 5 intentos fallidos, un login con la contraseña correcta devuelve 423 `ACCOUNT_LOCKED`. Tras mover `locked_until` al pasado en la base, el login correcto devuelve 204. **Implementación:** `admin-auth.routes.test.ts`.

### Test E10 — Sesión ausente, inválida o vencida
`/me` responde 401 `UNAUTHENTICATED` en los tres casos:
- sin cookie;
- con un token aleatorio;
- con `expires_at` en el pasado (en este caso además se borra la fila de la sesión).

**Implementación:** `admin-auth.routes.test.ts`.

### Test E11 — Origen ajeno
`POST /api/admin/login` sin `Origin`, o con `Origin: https://evil.example`, devuelve 403 `FORBIDDEN_ORIGIN`. **Implementación:** `admin-auth.routes.test.ts`.

### Test de cookie y sesión
`Set-Cookie` contiene:
- `__Host-cat_session=`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` y `Max-Age=2592000`.

Además:
- el `id` guardado en `sessions` es distinto del token;
- después de `logout`, `/me` devuelve 401.

**Implementación:** `admin-auth.routes.test.ts`.

### Test de UI del login
`LoginPage.test.tsx` con `fetch` mockeado: 401 muestra "Usuario o contraseña incorrectos"; 423 muestra el mensaje de bloqueo; 204 navega a `/admin`.

---

## Verificación Final

Automáticas:
1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` sin errores.

Manuales:
2. Con `npm run dev`:
   - `/admin` redirige a `/admin/login`;
   - con el usuario creado por el CLI, entrar muestra "BANNED" en el header;
   - "Salir" vuelve al login;
   - 5 claves erróneas muestran el mensaje de bloqueo.

---

## Qué Hacer al Terminar

1. Reportar archivos creados y modificados, verificaciones y desvíos. **No** incluir en el reporte contraseñas generadas.
2. No commitear ni pushear sin instrucción explícita.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial del plan.
