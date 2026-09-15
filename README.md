# Catálogo

Motor de catálogo web multi-tenant (Base + Vapers + Apple) sobre Cloudflare Workers, D1 y Workers KV. Ver el diseño completo en [docs/specs/ARQUITECTURA_DEL_SISTEMA.md](docs/specs/ARQUITECTURA_DEL_SISTEMA.md) y el análisis del arquitecto en [docs/specs/CATALOGO_ARQUITECTO_v1.0.md](docs/specs/CATALOGO_ARQUITECTO_v1.0.md).

## Requisitos

- Node.js 22 LTS (ver [.nvmrc](.nvmrc)) y npm 10+.
- Cuenta gratuita de Cloudflare (solo para desplegar; no hace falta para desarrollar en local).

## Instalación

```bash
npm install
```

El repo usa `legacy-peer-deps=true` (ver [.npmrc](.npmrc)): el resolver estricto de npm 10 falla con el grafo de peer dependencies de `vitest`/`@cloudflare/vitest-pool-workers`; el modo legacy lo evita sin cambiar las versiones instaladas.

## Comandos

| Comando                                              | Qué hace                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`                                        | Levanta Vite + el Worker (workerd) en local con hot reload.                     |
| `npm run build`                                      | Typecheck de los tres proyectos y build de producción (SPA + Worker).           |
| `npm run deploy`                                     | Build y despliegue a Cloudflare Workers.                                        |
| `npm run typecheck`                                  | `tsc -b` sobre `tsconfig.app/worker/node.json`.                                 |
| `npm run lint`                                       | ESLint sobre todo el repo.                                                      |
| `npm run format` / `format:check`                    | Prettier (escribe / solo verifica).                                             |
| `npm test`                                           | Corre `test:unit` y `test:worker`.                                              |
| `npm run test:unit`                                  | Vitest (jsdom) para `src/shared`, `src/web` y `scripts`.                        |
| `npm run test:worker`                                | Vitest sobre el Worker real (`@cloudflare/vitest-pool-workers`, D1/KV locales). |
| `npm run db:migrate:local` / `db:migrate:remote`     | Aplica las migraciones de `migrations/` a D1 local o remota.                    |
| `npm run cf-typegen`                                 | Regenera `worker-configuration.d.ts` a partir de `wrangler.jsonc`.              |
| `npm run tenant -- upsert <archivo.json> [--remote]` | Da de alta o actualiza un tenant desde un JSON de `tenants/`.                   |

## Arranque local

```bash
npm run db:migrate:local
npm run tenant -- upsert tenants/banned.json
npm run dev
```

Abrir `http://localhost:5173/banned` (catálogo del tenant BANNED) y `http://localhost:5173/no-existe` (404 → "Catálogo no encontrado").

## Estructura

```
src/shared/   código isomórfico: types, schemas Zod, dominio puro, constantes
src/worker/   Worker Hono: routes → services → repositories, sobre D1/KV
src/web/      SPA React: features/, api/, shared/
scripts/      CLI de aprovisionamiento (tenant.ts, lib/)
migrations/   SQL versionado de D1
tenants/      configuración de cada tenant (JSON, sin secretos)
```

Detalle completo de capas y convenciones en el [Mapa del Sistema](docs/specs/ARQUITECTURA_DEL_SISTEMA.md).

## Despliegue a producción

Pasos manuales (una sola vez por cuenta de Cloudflare):

1. Crear una cuenta gratuita en [cloudflare.com](https://cloudflare.com) y ejecutar `npx wrangler login`.
2. Crear la base D1: `npx wrangler d1 create catalogo-db`, y copiar el `database_id` devuelto en `wrangler.jsonc` (reemplazar `REEMPLAZAR_CON_ID_REAL`).
3. Aplicar las migraciones en remoto: `npm run db:migrate:remote`.
4. Dar de alta el tenant BANNED en remoto: `npm run tenant -- upsert tenants/banned.json --remote`.
5. Desplegar: `npm run deploy`. Si Cloudflare lo pide, registrar el subdominio `workers.dev` la primera vez.

### URL pública

_A completar por el desarrollador después del primer deploy_ (formato `https://catalogo.<subdominio>.workers.dev/banned`).
