# Plan de Ejecución — CAT-01 Esqueleto desplegado con marca del tenant

## Metadatos

- **ID:** CAT-01 (fase A, 1 de 11)
- **Versión:** v1.0
- **Fecha:** 2026-09-14
- **Origen:** `docs/specs/CATALOGO_ARQUITECTO_v1.0.md` (justificaciones y diagramas) y `docs/specs/ARQUITECTURA_DEL_SISTEMA.md` (convenciones §3 y §6).
- **Destinatario:** Agente Ejecutor. Documento agnóstico de herramienta.
- **Base de código requerida:** directorio sin git que contiene solo `docs/specs/`. Esta tarea crea el proyecto.
- **Stack y comandos:** Node.js 22 LTS + npm 10. Los scripts npm los crea T02 de este plan: `dev`, `build`, `deploy`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:unit`, `test:worker`, `db:migrate:local`, `db:migrate:remote`, `cf-typegen`, `tenant`.

---

## Misión

Inicializar el repositorio y dejar desplegado en Cloudflare Workers un esqueleto donde `https://catalogo.<subdominio>.workers.dev/banned` muestra el nombre y el color de marca del tenant BANNED leídos desde D1, y un slug inexistente muestra "Catálogo no encontrado".

---

## Guardarraíles (No Negociables)

### Lo que NO se modifica
- Ningún archivo de `docs/specs/`.
- No se agregan dependencias fuera de las listadas en T02.

### Convenciones de código a respetar
- Estructura y capas del Mapa §3: `src/shared` (isomórfico, sin APIs de DOM ni de Node), `src/worker` (routes → services → repositories), `src/web` (features). `shared` no importa de `worker` ni de `web`; `web` y `worker` no se importan entre sí.
- Tipos, esquemas Zod y constantes en archivos propios (`*.types.ts`, `*.schema.ts`, `constants.ts`), nunca declarados inline en un service o componente.
- Archivos TS en kebab-case con sufijo de rol (`tenants.repo.ts`, `catalog.service.ts`, `public.routes.ts`); componentes React en PascalCase; hooks `useX.ts`.
- Identificadores en inglés; textos de UI y mensajes de error para el usuario en español.
- Errores del Worker: `throw new ApiError(status, code, message, details?)`; respuesta `{ "error": { "code", "message", "details"? } }`.
- SQL solo en `src/worker/repositories/`, siempre con `prepare().bind()` (nunca concatenar valores).
- Tests colocados junto al archivo probado (`*.test.ts` / `*.test.tsx`).
- TypeScript `strict`; prohibido `any` explícito; sin `dangerouslySetInnerHTML`.

### Constraints técnicas
- Node 22 LTS. `wrangler` como devDependency (invocar con `npx wrangler`), nunca global.
- El código del Worker no usa APIs de Node ni `nodejs_compat`. IDs con `crypto.randomUUID()`.
- No commitear ni pushear sin confirmación humana.

---

## Entorno de Ejecución y Verificación

- **Arranque local:** `npm run db:migrate:local && npm run tenant -- upsert tenants/banned.json && npm run dev` → Vite + workerd con D1 local en `.wrangler/state`.
- **Servicios mockeados:** ninguno.
- **Datos de prueba:** `tenants/banned.json` y `tenants/demo.json` (el tenant demo es solo para uso local y tests).
- **Limitación declarada:** el despliegue (T07) requiere pasos humanos: cuenta Cloudflare y `wrangler login`.

---

## Archivos a Crear

1. `.gitignore`, `.gitattributes`, `.editorconfig`, `.nvmrc`, `.prettierrc.json`, `.prettierignore` — higiene.
2. `package.json` — dependencias y scripts.
3. `tsconfig.json`, `tsconfig.app.json`, `tsconfig.worker.json`, `tsconfig.node.json` — type-check por proyecto.
4. `vite.config.ts`, `vitest.config.ts`, `vitest.workers.config.ts`, `eslint.config.js`, `wrangler.jsonc`.
5. `worker-configuration.d.ts` — generado por `npm run cf-typegen`, se versiona.
6. `index.html`, `public/favicon.svg`.
7. `migrations/0001_tenants.sql`.
8. `tenants/banned.json`, `tenants/demo.json`.
9. `src/shared/constants.ts` — `CURRENCIES`, `RESERVED_SLUGS`.
10. `src/shared/types/tenant.types.ts` — `Currency`, `TenantConfig`.
11. `src/shared/types/catalog.types.ts` — `StockMode`, `ProductStatus`, `AttributeType`, `AttributeDef`, `Choice` (contrato completo; se usa desde CAT-02).
12. `src/shared/types/api.types.ts` — `ApiErrorBody`, `PublicTenant`, `PublicCategory`, `PublicProduct`, `PublicCatalogResponse`.
13. `src/shared/schemas/tenant.schema.ts` + `tenant.schema.test.ts`.
14. `src/shared/domain/color.ts` + `color.test.ts` — `contrastText(hex)`.
15. `src/worker/index.ts`, `src/worker/app.ts`.
16. `src/worker/lib/errors.ts`, `src/worker/lib/ids.ts`.
17. `src/worker/middleware/security-headers.ts`.
18. `src/worker/repositories/row.types.ts` — `TenantRow` (se extiende en tareas siguientes).
19. `src/worker/repositories/tenants.repo.ts`.
20. `src/worker/services/catalog.service.ts`.
21. `src/worker/routes/public.routes.ts` + `public.routes.test.ts`.
22. `src/worker/test/apply-migrations.ts`, `src/worker/test/factories.ts`, `src/worker/test/env.d.ts`.
23. `src/web/main.tsx`, `src/web/router.tsx`, `src/web/index.css`, `src/web/test/setup.ts`.
24. `src/web/api/http.ts`, `src/web/api/public.api.ts`.
25. `src/web/shared/theme.ts`, `src/web/shared/components/Spinner.tsx`.
26. `src/web/features/tenant/tenant-context.ts`, `TenantLayout.tsx`, `TenantLayout.test.tsx`, `HomePage.tsx`, `NotFoundPage.tsx`.
27. `src/web/features/catalog/hooks/useCatalog.ts`.
28. `scripts/tenant.ts`, `scripts/lib/sql.ts`, `scripts/lib/sql.test.ts`, `scripts/lib/tenant-sql.ts`, `scripts/lib/tenant-sql.test.ts`, `scripts/lib/wrangler.ts`.
29. `README.md`.

## Archivos a Modificar

Ninguno (proyecto nuevo).

---

## Tareas (Orden Topológico)

### T01 — Repositorio e higiene

**Qué hacer:**
1. `git init -b main`. Pedir confirmación humana para un commit inicial en `main` con `docs/` solamente; luego `git switch -c cat-01-esqueleto`. Si el humano no confirma, trabajar en `main` sin commitear.
2. `.gitignore`: `node_modules/`, `dist/`, `.wrangler/`, `.dev.vars*`, `coverage/`, `*.log`, `.DS_Store`.
3. `.gitattributes`: `* text=auto eol=lf`. `.editorconfig`: UTF-8, LF, 2 espacios. `.nvmrc`: `22`.
4. `.prettierrc.json`: `{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all", "endOfLine": "lf" }`. `.prettierignore`: `dist`, `.wrangler`, `worker-configuration.d.ts`, `package-lock.json`, `docs`.

**Criterio de validación:** `git status` muestra el repositorio inicializado en la rama esperada.

**Depende de:** Ninguna.

### T02 — Proyecto y toolchain

**Qué hacer:**
1. `package.json` con `"type": "module"`, `"private": true`, `"engines": { "node": ">=22" }`.
2. Instalar dependencias: `npm install react react-dom react-router hono zod`, y `npm install -D typescript vite @vitejs/plugin-react @cloudflare/vite-plugin wrangler tailwindcss @tailwindcss/vite vitest @cloudflare/vitest-pool-workers jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/react @types/react-dom @types/node eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals prettier tsx`. Si `@cloudflare/vitest-pool-workers` declara un peer dependency de `vitest` con otra versión, instalar esa versión de `vitest`.
3. Scripts:
   - `dev`: `vite`
   - `build`: `tsc -b && vite build`
   - `deploy`: `npm run build && wrangler deploy`
   - `typecheck`: `tsc -b`
   - `lint`: `eslint .`
   - `format`: `prettier --write .`
   - `format:check`: `prettier --check .`
   - `test`: `npm run test:unit && npm run test:worker`
   - `test:unit`: `vitest run --config vitest.config.ts`
   - `test:worker`: `vitest run --config vitest.workers.config.ts`
   - `db:migrate:local`: `wrangler d1 migrations apply catalogo-db --local`
   - `db:migrate:remote`: `wrangler d1 migrations apply catalogo-db --remote`
   - `cf-typegen`: `wrangler types`
   - `tenant`: `tsx scripts/tenant.ts`
4. `wrangler.jsonc`:
   ```jsonc
   {
     "$schema": "node_modules/wrangler/config-schema.json",
     "name": "catalogo",
     "main": "src/worker/index.ts",
     "compatibility_date": "2026-09-01",
     "assets": { "binding": "ASSETS", "not_found_handling": "single-page-application", "run_worker_first": ["/api/*"] },
     "d1_databases": [
       { "binding": "DB", "database_name": "catalogo-db", "database_id": "REEMPLAZAR_CON_ID_REAL", "migrations_dir": "migrations" }
     ],
     "observability": { "enabled": true }
   }
   ```
5. `vite.config.ts` con los plugins `react()`, `tailwindcss()` y `cloudflare()`.
6. `tsconfig.json` sin archivos propios y con referencias a los tres proyectos:
   - `tsconfig.app.json`: incluye `src/web` y `src/shared`; `lib` con DOM; `jsx: react-jsx`; tipos `vite/client`.
   - `tsconfig.worker.json`: incluye `src/worker`, `src/shared` y `worker-configuration.d.ts`; sin DOM; tipos `@cloudflare/vitest-pool-workers`.
   - `tsconfig.node.json`: incluye los `*.config.ts`, `eslint.config.js` y `scripts`; tipos `node`.

   Los tres con `strict`, `noEmit`, `moduleResolution: bundler`, `target: ES2022` y `tsBuildInfoFile` en `node_modules/.tmp/`.
7. `vitest.config.ts` (sin el plugin de Cloudflare): `environment: 'jsdom'`, include `src/shared/**/*.test.ts`, `src/web/**/*.test.{ts,tsx}`, `scripts/**/*.test.ts`; setup `src/web/test/setup.ts` (importa `@testing-library/jest-dom/vitest`).
8. `vitest.workers.config.ts`: usar la configuración del pool de workers (`defineWorkersConfig` o la API vigente del paquete) con:
   - `wrangler.configPath: './wrangler.jsonc'`;
   - include `src/worker/**/*.test.ts`;
   - migraciones leídas con `readD1Migrations('migrations')` y expuestas como binding `TEST_MIGRATIONS`;
   - setup `src/worker/test/apply-migrations.ts`, que ejecuta `applyD1Migrations(env.DB, env.TEST_MIGRATIONS)`.

   `src/worker/test/env.d.ts` declara `TEST_MIGRATIONS` en el `ProvidedEnv` de `cloudflare:test`.
9. `eslint.config.js`: `@eslint/js` recommended + `typescript-eslint` recommended; `react-hooks` y `react-refresh` para `src/web`; ignores `dist`, `.wrangler`, `worker-configuration.d.ts`.
10. `index.html` (`lang="es"`, meta viewport, `<title>Catálogo</title>`, `<div id="root">`, script `/src/web/main.tsx`) y `public/favicon.svg` simple.
11. Ejecutar `npm run cf-typegen`.

**Criterio de validación:** con un `main.tsx` mínimo, `npm run typecheck`, `npm run lint` y `npm run build` terminan sin errores, y `npm run dev` levanta sin errores. **Si alguno falla por la ruta del proyecto (espacios o acentos), detenerse y reportar al humano** (riesgo R08: mover el repo a una ruta ASCII sin espacios).

**Depende de:** T01.

### T03 — Tipos, esquema y helpers compartidos

**Qué hacer:**
1. `constants.ts`: `CURRENCIES = ['ARS', 'USD'] as const`; `RESERVED_SLUGS = ['admin', 'api', 'img', 'assets'] as const`.
2. `tenant.types.ts`: `Currency`; `TenantConfig = z.infer<typeof tenantConfigSchema>` (re-exportado).
3. `catalog.types.ts`:
   - `StockMode = 'availability' | 'unit' | 'quantity'`;
   - `ProductStatus = 'active' | 'paused' | 'sold'`;
   - `AttributeType = 'text' | 'number' | 'enum'`;
   - `AttributeDef { key; label; type; unit?; options?: string[]; required?; filter?: 'multi' | 'min' | 'max'; showInCard? }`;
   - `Choice { value: string; available: boolean }`.
4. `api.types.ts`:
   - `ApiErrorBody { error: { code: string; message: string; details?: unknown } }`;
   - `PublicTenant { slug; name; logoUrl: string | null; primaryColor; whatsapp; currency; ageGate: boolean }`;
   - `PublicCategory { key; name; sortOrder; attributeSchema: AttributeDef[]; choiceLabel: string | null }`;
   - `PublicProduct { id; categoryKey; name; description: string | null; image: { thumb: string; full: string } | null; priceCents; currency; priceNote: string | null; stockMode; stockQty: number | null; attributes: Record<string, string | number>; choices: string[] }`;
   - `PublicCatalogResponse { tenant; categories; products }`.
5. `tenant.schema.ts`: `tenantConfigSchema` con:
   - `slug`: regex `^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])$` y no incluido en `RESERVED_SLUGS`;
   - `name`: 1–60 caracteres;
   - `primaryColor`: `^#[0-9a-fA-F]{6}$`;
   - `whatsapp`: `^\d{10,15}$`;
   - `currency`: enum `CURRENCIES`;
   - `ageGate` y `noindex`: boolean;
   - `isActive`: boolean, default `true`.

   Exportar además `slugSchema`.
6. `color.ts`: `contrastText(hex): '#000000' | '#FFFFFF'` por luminancia relativa (WCAG).

**Criterio de validación:** `npm run test:unit` pasa `tenant.schema.test.ts` (acepta banned.json; rechaza slug `admin`, color `red`, whatsapp `+54 9 261`) y `color.test.ts` (`#111111` → blanco; `#FFFF00` → negro).

**Depende de:** T02.

### T04 — Migración y CLI de tenants

**Qué hacer:**
1. `migrations/0001_tenants.sql`:
   ```sql
   CREATE TABLE tenants (
     id TEXT PRIMARY KEY,
     slug TEXT NOT NULL UNIQUE,
     name TEXT NOT NULL,
     logo_key TEXT,
     primary_color TEXT NOT NULL,
     whatsapp TEXT NOT NULL,
     currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS','USD')),
     age_gate INTEGER NOT NULL DEFAULT 0,
     noindex INTEGER NOT NULL DEFAULT 0,
     is_active INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   ```
2. `tenants/banned.json`: `{ "slug": "banned", "name": "BANNED", "primaryColor": "#111111", "whatsapp": "5490000000000", "currency": "ARS", "ageGate": true, "noindex": true }`. `tenants/demo.json`: `{ "slug": "demo", "name": "Tienda Demo", "primaryColor": "#2563EB", "whatsapp": "5490000000001", "currency": "ARS", "ageGate": false, "noindex": true }`.
3. `scripts/lib/sql.ts`:
   - `sqlValue(v: string | number | boolean | null): string` — strings entre comillas simples con `'` duplicada, booleanos `1/0`, `null` → `NULL`; números no finitos lanzan error;
   - `sqlJson(v: unknown)` = `sqlValue(JSON.stringify(v))`.
4. `scripts/lib/tenant-sql.ts`: `buildTenantUpsertSql(config: TenantConfig, id: string): string`, que genera `INSERT INTO tenants (...) VALUES (...) ON CONFLICT(slug) DO UPDATE SET name=excluded.name, primary_color=excluded.primary_color, whatsapp=excluded.whatsapp, currency=excluded.currency, age_gate=excluded.age_gate, noindex=excluded.noindex, is_active=excluded.is_active, updated_at=datetime('now');`.
5. `scripts/lib/wrangler.ts`:
   - `runWrangler(args)` con `spawnSync('npx', ['wrangler', ...args], { stdio: 'inherit', shell: process.platform === 'win32' })`, que lanza error si el exit code ≠ 0;
   - `d1ExecuteFile(file, target: 'local' | 'remote')`;
   - `d1Query<T>(sql, target)`, que usa `--json` y devuelve `results`.
6. `scripts/tenant.ts`: comando `upsert <archivo.json> [--remote]` (con `parseArgs` de `node:util`). Lee y valida con `tenantConfigSchema`; si falla, imprime los errores y sale con código 1. Genera un UUID, escribe el SQL en un archivo temporal de `os.tmpdir()` y lo ejecuta con `d1ExecuteFile`. Por defecto el destino es local.

**Criterio de validación:**
```bash
npm run test:unit        # incluye sql.test.ts (O'Brien → 'O''Brien'; null → NULL; NaN lanza) y tenant-sql.test.ts
npm run db:migrate:local
npm run tenant -- upsert tenants/banned.json
npx wrangler d1 execute catalogo-db --local --command "SELECT slug, name, age_gate FROM tenants"
# Debe listar banned | BANNED | 1. Re-ejecutar el upsert no duplica filas.
```

**Depende de:** T03.

### T05 — Endpoint público del catálogo (Worker)

**Qué hacer:**
1. `lib/errors.ts`: clase `ApiError(status, code, message, details?)` y `errorHandler`:
   - `ApiError` → su status con `ApiErrorBody`;
   - `ZodError` → 400 `VALIDATION_ERROR` con `issues` en `details`;
   - resto → 500 `INTERNAL_ERROR`, loguea en JSON sin datos sensibles.
2. `lib/ids.ts`: `newId()` con `crypto.randomUUID()`.
3. `middleware/security-headers.ts`: agrega `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`.
4. `repositories/row.types.ts`: `TenantRow` con las columnas de la tabla. `repositories/tenants.repo.ts`: `findActiveTenantBySlug(db, slug): Promise<TenantRow | null>` (`is_active = 1`).
5. `services/catalog.service.ts`: `getPublicCatalog(db, slug): Promise<PublicCatalogResponse>`. Si no existe el tenant, `ApiError(404, 'TENANT_NOT_FOUND', 'Catálogo no encontrado')`. Mapea a `PublicTenant` (`logoUrl` = `/img/<logo_key>` o `null`; `ageGate` booleano) y devuelve `categories: []` y `products: []` (se completan en CAT-02).
6. `routes/public.routes.ts`: `GET /tenants/:slug/catalog`. Un slug que no cumple `slugSchema` devuelve 404 `TENANT_NOT_FOUND`. Responde JSON con `Cache-Control: no-store`.
7. `app.ts`: `createApp()` crea `Hono<{ Bindings: Env }>`; usa `securityHeaders` en `/api/*` y monta `publicRoutes` en `/api/public`. `notFound` → 404 `NOT_FOUND` para `/api/*` y `c.env.ASSETS.fetch(c.req.raw)` para el resto; `onError(errorHandler)`. `index.ts` exporta por defecto la app.
8. `test/factories.ts`: `insertTenant(db, overrides?)` con valores por defecto de BANNED.

**Criterio de validación:** `npm run test:worker` pasa `public.routes.test.ts` (ver Tests Obligatorios).

**Depende de:** T04.

### T06 — SPA: layout por tenant y páginas base

**Qué hacer:**
1. `api/http.ts`: `HttpError(status, code, message)` y `fetchJson<T>(url, init?)` con `credentials: 'same-origin'`. Ante una respuesta que no es 2xx, lee el `ApiErrorBody` y lanza `HttpError`. `api/public.api.ts`: `getCatalog(slug)`.
2. `features/catalog/hooks/useCatalog.ts`: devuelve `{ status: 'loading' | 'ready' | 'not-found' | 'error', data?, reload }` y cancela la petición al desmontar.
3. `features/tenant/tenant-context.ts`: `TenantContext` (valor `{ catalog: PublicCatalogResponse; reload }`) y `useTenant()`, que lanza si se usa fuera del layout.
4. `shared/theme.ts`: `brandStyle(primaryColor)` devuelve `{ '--brand': color, '--brand-contrast': contrastText(color) }` como `CSSProperties`. `index.css`: `@import "tailwindcss";` + `@theme inline { --color-brand: var(--brand); --color-brand-contrast: var(--brand-contrast); }`.
5. `features/tenant/TenantLayout.tsx`: toma `slug` de la ruta y llama a `useCatalog`.
   - Cargando → `Spinner`.
   - `not-found` → `NotFoundPage`.
   - `error` → mensaje "No pudimos cargar el catálogo" con botón Reintentar.
   - `ready` → contenedor con `brandStyle`, `document.title = tenant.name`, header `bg-brand text-brand-contrast` con el nombre, y `<Outlet />` dentro de `TenantContext`.
6. `HomePage.tsx`: texto neutro "Catálogos online" (no lista tenants). `NotFoundPage.tsx`: "Catálogo no encontrado".
7. `router.tsx` con `createBrowserRouter`: `/` → HomePage; `/:slug` → TenantLayout, con índice provisorio "Catálogo en preparación" (lo reemplaza CAT-02); `*` → NotFoundPage. `main.tsx` monta `RouterProvider`.

**Criterio de validación:** `npm run test:unit` pasa `TenantLayout.test.tsx` (ver Tests Obligatorios); manualmente, `npm run dev` y abrir `/banned` (header BANNED en #111111 con texto blanco) y `/no-existe` ("Catálogo no encontrado").

**Depende de:** T05.

### T07 — README y despliegue

**Qué hacer:**
1. `README.md`: requisitos, instalación, comandos, arranque local, estructura resumida (enlazar el Mapa) y el runbook de despliegue de abajo.
2. Pasos **humanos** (el agente los documenta y guía; no crea cuentas):
   1. Crear una cuenta gratuita de Cloudflare y ejecutar `npx wrangler login`.
   2. `npx wrangler d1 create catalogo-db` y copiar el `database_id` en `wrangler.jsonc`.
   3. `npm run db:migrate:remote`.
   4. `npm run tenant -- upsert tenants/banned.json --remote`.
   5. `npm run deploy`; si lo pide, registrar el subdominio `workers.dev`.
3. Anotar en el README la URL pública obtenida.

**Criterio de validación:** `https://catalogo.<subdominio>.workers.dev/banned` muestra el header de BANNED, y `/no-existe` muestra "Catálogo no encontrado".

**Depende de:** T06.

---

## Tests Obligatorios

### Test AC06 (parcial) — Catálogo accesible por link público sin login
**Dado:** el tenant `banned` activo en D1 (factory). **Cuando:** `GET /api/public/tenants/banned/catalog` sin cookies. **Entonces:** 200; `tenant.name = 'BANNED'`, `tenant.ageGate = true`, `categories` y `products` son arrays; header `Cache-Control: no-store`.
**Implementación:** `src/worker/routes/public.routes.test.ts`.

### Test E01 — Slug inexistente o tenant inactivo
**Dado:** no existe `no-existe` y el tenant `demo` está con `is_active = 0`. **Cuando:** se piden sus catálogos. **Entonces:** 404 con `error.code = 'TENANT_NOT_FOUND'` en ambos.
**Implementación:** `public.routes.test.ts`; en UI, `TenantLayout.test.tsx` con `fetch` mockeado que devuelve 404 → se ve "Catálogo no encontrado".

### Test de marca — Layout aplica el tenant
**Dado:** `fetch` mockeado con el catálogo de BANNED. **Cuando:** se renderiza `/banned`. **Entonces:** se ve "BANNED" en el header y `document.title === 'BANNED'`.
**Implementación:** `src/web/features/tenant/TenantLayout.test.tsx`.

---

## Verificación Final

Automáticas:
1. `npm run lint` sin errores.
2. `npm run typecheck` sin errores.
3. `npm test` (unit + worker) en verde.
4. `npm run format:check` sin diferencias.
5. `npm run build` sin errores.

Manuales (humano o agente con navegador):
6. Local: `/banned` muestra la marca; `/no-existe` muestra "Catálogo no encontrado".
7. Producción: lo mismo en la URL `workers.dev`.

---

## Qué Hacer al Terminar

1. Reportar al humano archivos creados, resultado de cada verificación, URL pública y cualquier desvío del plan.
2. No hacer commit ni push sin instrucción explícita.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial del plan.
