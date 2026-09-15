# Plan de Ejecución — CAT-07 Puesta en producción de BANNED

## Metadatos

- **ID:** CAT-07 (fase A, 7 de 11 — cierra la fase A)
- **Versión:** v1.0
- **Fecha:** 2026-09-14
- **Origen:** `docs/specs/CATALOGO_ARQUITECTO_v1.0.md` (D17, D18, D23, riesgos R01/R02/R03/R13/R15) y `docs/specs/ARQUITECTURA_DEL_SISTEMA.md`.
- **Destinatario:** Agente Ejecutor + humano (hay pasos que solo puede hacer el humano).
- **Base de código requerida:** CAT-03 y CAT-06 completos e integrados en `main` (CAT-01…CAT-06 terminados). Rama `cat-07-produccion-banned`.
- **Stack y comandos:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run deploy`, `npm run db:migrate:remote`, `npm run tenant`, `npm run admin`, `npx wrangler tail`.

---

## Misión

Publicar el catálogo de BANNED en producción con su marca y número de WhatsApp reales. Incluye:
- HTML por tenant (título, vista previa del link y `noindex`);
- cabeceras de seguridad;
- runbook de despliegue, backup y rollback;
- una prueba manual completa en celulares Android e iPhone.

---

## Guardarraíles (No Negociables)

### Lo que NO se modifica
- `docs/specs/`, migraciones existentes y endpoints existentes (solo se agregan cabeceras).
- `tenants/demo.json` **nunca** se aprovisiona en remoto. `seed:dev` **nunca** se ejecuta en remoto.

### Convenciones de código a respetar
- Las de CAT-01…CAT-06 y del Mapa §3/§6.
- La vista previa del link de un tenant con `ageGate` usa **solo el logo**, nunca fotos de producto.
- Todo texto que venga de la base y se inserte en HTML se escapa (`src/worker/lib/html.ts`).

### Constraints técnicas
- Los estáticos (`/assets/*`, `favicon.svg`, `placeholder.svg`) se sirven sin invocar al Worker. Solo la navegación HTML, `/api/*` e `/img/*` pasan por él.
- La contraseña del administrador se entrega al emprendedor por un canal privado y no queda en el repositorio, en logs ni en el reporte.

---

## Entorno de Ejecución y Verificación

- **Local:** `npm run build && npm run dev` para probar el HTML por tenant.
- **Producción:** `https://catalogo.<subdominio>.workers.dev`.
- **Datos reales requeridos (los provee el emprendedor):**
  - número de WhatsApp en formato internacional sin `+` ni espacios (Argentina: `549` + característica sin 0 + número sin 15);
  - color de marca;
  - logo PNG, JPG o WebP de 300 KB como máximo;
  - nombre de usuario del admin.
- **Limitación declarada:** la vista previa del link en WhatsApp puede tardar en actualizarse por la caché de WhatsApp.

---

## Archivos a Crear

1. `src/worker/lib/html.ts` + `.test.ts` — `escapeHtml`.
2. `src/worker/services/shell.service.ts` + `.test.ts` — `buildShellMeta(db, url)` y `applyShellMeta(response, meta)` (con HTMLRewriter).
3. `src/worker/routes/html.routes.ts` — navegación HTML.
4. `docs/RUNBOOK.md` — despliegue, backup, restauración, rollback y alta o reseteo de admins.

## Archivos a Modificar

1. `wrangler.jsonc` — `assets.run_worker_first`: `["/*", "!/assets/*", "!/favicon.svg", "!/placeholder.svg"]`. Si la versión instalada de wrangler rechaza los patrones con `!`, usar `true` y dejar que `html.routes.ts` delegue en `env.ASSETS` todo lo que no sea navegación (documentar el desvío).
2. `src/worker/middleware/security-headers.ts` — exportar `htmlSecurityHeaders` (ver T01).
3. `src/worker/app.ts` — montar `html.routes` **al final**, después de `/api/*` e `/img/*`.
4. `tenants/banned.json` — datos reales (`whatsapp`, `primaryColor`) con `ageGate: true` y `noindex: true`.
5. `.gitignore` — agregar `backups/`.
6. `README.md` — enlace al runbook y a la sección de riesgos aceptados de `docs/specs/CATALOGO_ARQUITECTO_v1.0.md`.

---

## Tareas (Orden Topológico)

### T01 — HTML por tenant y cabeceras de seguridad

**Qué hacer:**
1. `escapeHtml`: escapa `& < > " '`.
2. `buildShellMeta(db, url)` → `{ status, title, description, imageUrl | null, noindex }`:
   - `/` → título "Catálogos online", 200, indexable;
   - `/admin*` → título "Panel", `noindex`;
   - `/<slug>…` con tenant activo → título `tenant.name`, descripción `Catálogo de <nombre>`, `imageUrl` = URL absoluta del logo o `null`, `noindex` según el tenant, 200;
   - slug inexistente → título "Catálogo no encontrado", `noindex`, 404.
3. `applyShellMeta(response, meta)`, con HTMLRewriter:
   - reemplaza `<title>`;
   - agrega al `<head>` `og:title`, `og:description`, `og:type=website`, `og:url` y `og:image` (si existe), con valores escapados;
   - si `noindex`, agrega `<meta name="robots" content="noindex, nofollow">` y el header `X-Robots-Tag: noindex, nofollow`;
   - aplica `status` y `Cache-Control: no-cache`.
4. `htmlSecurityHeaders`:
   - `Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`;
   - `X-Frame-Options: DENY`;
   - `Referrer-Policy: strict-origin-when-cross-origin`;
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`;
   - `X-Content-Type-Options: nosniff`.
5. `html.routes.ts`, `GET *`:
   - si el path tiene extensión de archivo → `env.ASSETS.fetch(c.req.raw)`;
   - si no → obtiene el shell con `env.ASSETS.fetch(new Request(new URL('/', c.req.url)))`, aplica `buildShellMeta` + `applyShellMeta` + `htmlSecurityHeaders`.
6. Si la CSP rompe algo en el build real (probar con `npm run build && npm run dev`), ajustar la directiva mínima necesaria y documentar el cambio en el reporte.

**Criterio de validación:** `npm run test:worker` pasa `shell.service.test.ts` y `html.test.ts` (ver Tests Obligatorios). En local, `curl -i http://localhost:5173/banned` muestra `<title>BANNED</title>`, `X-Robots-Tag` y `Content-Security-Policy`.

**Depende de:** Ninguna.

### T02 — Runbook

**Qué hacer:** `docs/RUNBOOK.md` con comandos exactos para:
1. **Despliegue:** `npm run lint && npm run typecheck && npm test && npm run db:migrate:remote && npm run deploy`.
2. **Backup mensual:** `npx wrangler d1 export catalogo-db --remote --output backups/catalogo-<fecha>.sql` (la carpeta está en `.gitignore`; guardar el archivo fuera del repo).
3. **Restauración** a un punto de los últimos 7 días: `npx wrangler d1 time-travel restore catalogo-db --timestamp <ISO>`.
4. **Rollback del Worker:** `npx wrangler rollback`.
5. **Admins:** alta y reseteo de contraseña (`npm run admin -- create|reset-password … --remote`).
6. **Tenant:** alta o modificación y cambio de logo (`npm run tenant -- upsert … --remote [--logo …]`).
7. **Plan B de aislamiento (riesgo R02):** desplegar el mismo código en otra cuenta de Cloudflare con su propia base y namespace (repetir el runbook con otra configuración de wrangler), sin cambios de código.
8. **Diagnóstico:** `npx wrangler tail` y Workers Logs en el panel de Cloudflare.

**Criterio de validación:** revisión humana del runbook.

**Depende de:** T01.

### T03 — Aprovisionamiento de producción (asistido por el humano)

**Qué hacer:**
1. Pedir al humano los datos reales y actualizar `tenants/banned.json`.
2. El humano ejecuta (el agente guía y verifica las salidas):
   ```bash
   npm run db:migrate:remote
   npm run tenant -- upsert tenants/banned.json --logo <ruta-del-logo> --remote
   npm run admin -- create --tenant banned --username <usuario> --remote
   npm run deploy
   ```
3. El humano entrega la contraseña al emprendedor por un canal privado. El emprendedor carga los 12 modelos del catálogo PDF con sus fotos desde el panel (no es tiempo de desarrollo).

**Criterio de validación:** la consulta
```bash
npx wrangler d1 execute catalogo-db --remote --command "SELECT slug, whatsapp, age_gate, noindex FROM tenants"
```
muestra `banned` con el número real, `age_gate = 1` y `noindex = 1`, y **no** muestra `demo`.

**Depende de:** T02.

### T04 — Prueba manual en producción

**Qué hacer:** ejecutar el checklist de Verificación Final en un Android y en un iPhone, y registrar el resultado de cada ítem (OK / falla con detalle) en el reporte.

**Criterio de validación:** todos los ítems en OK, o fallas reportadas al humano con diagnóstico.

**Depende de:** T03.

---

## Tests Obligatorios

### Test de HTML por tenant — metadatos
`shell.service.test.ts`:
- `/banned` con tenant `noindex` y logo → título "BANNED", `og:image` absoluto al logo y `noindex: true`;
- `/no-existe` → 404 y `noindex`;
- `/admin/login` → `noindex`;
- `/` → indexable.

### Test de escape
`html.test.ts` y `shell.service.test.ts`: un tenant llamado `<script>x</script>` produce el título escapado y no inyecta etiquetas.

### Test de vista previa sin fotos de producto
Para un tenant con `ageGate`, el `og:image` es el logo o no existe; nunca una URL `-480` o `-1200`.

### Criterios del contrato en producción
Base AC01–AC06: se verifican manualmente con el checklist de abajo. Automáticamente ya los cubren CAT-02…CAT-06.

---

## Verificación Final

Automáticas:
1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` sin errores.

**Manuales en producción** (Android e iPhone; declarado explícitamente como verificación manual):

| # | Criterio | Pasos | Resultado esperado |
|---|---|---|---|
| S1 | AC06 + AC01 | Abrir `https://catalogo.<subdominio>.workers.dev/banned` sin sesión | Aviso +18; al aceptar, grilla con fotos, precios y puffs reales |
| S2 | E02 | Pestaña privada → "Soy menor de 18" | Bloqueo sin productos |
| S3 | AC04 | Agregar 2 modelos con sabores → carrito → "Enviar pedido por WhatsApp" | Se abre el chat del número real con el mensaje y el total correcto |
| S4 | AC02 | En el panel, pausar un modelo y recargar el catálogo | Desaparece; al reactivarlo, vuelve |
| S5 | AC03 | Crear un producto de prueba con foto desde el celular | Aparece con foto; luego eliminarlo |
| S6 | AC05 | Login del admin | Solo ve BANNED (el aislamiento entre tenants lo cubren los tests automáticos) |
| S7 | Vista previa | Pegar el link en un chat de WhatsApp | Título "BANNED" y logo, sin fotos de producto |
| S8 | Cabeceras | `curl -I https://…/banned` y `curl -I https://…/api/public/tenants/banned/catalog` | `X-Robots-Tag: noindex`, CSP presente; el catálogo con `Cache-Control: no-store` |
| S9 | R03 | Login desde el celular con `npx wrangler tail` abierto | Login correcto; sin errores de límite de CPU (si aparecen, reportar: la opción es Workers Paid, USD 5/mes) |

---

## Qué Hacer al Terminar

1. Reportar archivos creados y modificados, URL de producción, resultado de S1–S9 y desvíos. Sin contraseñas en el reporte.
2. Sugerir al humano refrescar el Mapa del Sistema (v1.1, "fase A implementada") con el Arquitecto o el Ingeniero de Requisitos.
3. No commitear ni pushear sin instrucción explícita.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial del plan.
