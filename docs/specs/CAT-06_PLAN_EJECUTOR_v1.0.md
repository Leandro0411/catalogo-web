# Plan de Ejecución — CAT-06 Fotos de producto y logo del negocio

## Metadatos

- **ID:** CAT-06 (fase A, 6 de 11)
- **Versión:** v1.0
- **Fecha:** 2026-09-14
- **Origen:** `docs/specs/CATALOGO_ARQUITECTO_v1.0.md` (D16, D27, riesgos R07/R10/R12/R16) y `docs/specs/ARQUITECTURA_DEL_SISTEMA.md`.
- **Destinatario:** Agente Ejecutor. Documento agnóstico de herramienta.
- **Base de código requerida:** CAT-05 completo e integrado en `main`. Rama `cat-06-fotos`.
- **Stack y comandos:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:unit`, `npm run test:worker`, `npm run build`, `npm run dev`, `npm run cf-typegen`, `npm run tenant`.

---

## Misión

Permitir que el administrador cargue la foto de cada producto desde el celular. La foto se comprime en el navegador a dos tamaños (480 px y 1200 px, WebP con respaldo JPEG) y se guarda en Workers KV con claves inmutables. El catálogo la sirve con caché de un año. El logo de cada tenant se carga por CLI y se muestra en la cabecera.

---

## Guardarraíles (No Negociables)

### Lo que NO se modifica
- `docs/specs/`, migraciones existentes y el contrato de `PublicCatalogResponse`.

### Convenciones de código a respetar
- Las de CAT-01…CAT-05 y del Mapa §3/§6.
- El Worker accede a las imágenes **solo** a través de la interfaz `ImageStore` (`src/worker/services/images/image-store.ts`); ningún otro archivo usa `env.IMAGES` directamente salvo `kv-image-store.ts`.
- El tipo de archivo se determina por **magic bytes** (`src/shared/domain/image-type.ts`), nunca por el `Content-Type` ni la extensión que declara el cliente.

### Constraints técnicas
- Claves: productos `t/<tenantId>/<uuid>-480` y `t/<tenantId>/<uuid>-1200` (la columna `image_key` guarda la base `t/<tenantId>/<uuid>`); logos `t/<tenantId>/logo-<uuid>`. Nunca se sobrescribe una clave existente.
- Productos: solo JPEG o WebP, ≤ 1 MB (`MAX_IMAGE_BYTES = 1_048_576`) por variante. Logos: PNG, JPEG o WebP, ≤ 300 KB (`MAX_LOGO_BYTES = 307_200`). SVG prohibido.
- Una imagen se borra de KV solo si ningún producto del tenant la referencia (los productos duplicados comparten foto).

---

## Entorno de Ejecución y Verificación

- **Arranque local:** `npm run db:migrate:local && npm run seed:dev && npm run dev`. El KV local lo emula workerd.
- **Paso humano previo al despliegue:** `npx wrangler kv namespace create catalogo-images` y copiar el `id` en `wrangler.jsonc`.
- **Limitación declarada:** la compresión real (canvas, HEIC de iPhone) solo se verifica en navegadores reales; los tests unitarios la mockean.

---

## Archivos a Crear

1. `src/shared/domain/image-type.ts` + `.test.ts` — `detectImageType(bytes)`.
2. `src/worker/services/images/image-store.ts` — interfaz `ImageStore { put(key, data, contentType); get(key); delete(key) }`.
3. `src/worker/services/images/kv-image-store.ts` — implementación sobre `KVNamespace`.
4. `src/worker/services/images/images.service.ts` + `.test.ts` — `saveProductImage`, `deleteProductImageIfUnreferenced`.
5. `src/worker/routes/admin-images.routes.ts` + `.test.ts`.
6. `src/worker/routes/images.routes.ts` + `.test.ts`.
7. `src/web/features/admin/lib/image-compress.ts` + `.test.ts`.
8. `src/web/features/admin/components/ImagePicker.tsx` + `.test.tsx`.

## Archivos a Modificar

1. `wrangler.jsonc`:
   - agregar `"kv_namespaces": [{ "binding": "IMAGES", "id": "REEMPLAZAR_CON_ID_REAL" }]`;
   - agregar `"/img/*"` a `assets.run_worker_first`.

   Luego ejecutar `npm run cf-typegen`.
2. `src/shared/constants.ts` — `IMAGE_SIZES = { thumb: 480, full: 1200 }`, `MAX_IMAGE_BYTES`, `MAX_LOGO_BYTES`.
3. `src/worker/app.ts` — montar `images.routes` (GET `/img/*`) y `admin-images.routes` en `/api/admin`.
4. `src/worker/routes/admin-products.routes.ts` — tras `PUT` con imagen distinta, y tras `DELETE`, liberar la imagen anterior con `c.executionCtx.waitUntil(deleteProductImageIfUnreferenced(...))`.
5. `src/worker/repositories/products.repo.ts` — `countProductsByImageKey(db, tenantId, imageKey)`.
6. `src/web/api/admin.api.ts` — `uploadProductImage(thumb, full): Promise<{ imageKey }>` (multipart).
7. `src/web/features/admin/components/ProductForm.tsx` — reemplazar el bloque "Foto: disponible próximamente" por `ImagePicker`.
8. `src/web/features/admin/components/ProductListItem.tsx` — miniatura real.
9. `src/web/features/tenant/TenantLayout.tsx` y `src/web/features/catalog/components/AgeGate.tsx` — mostrar el logo si hay `logoUrl`.
10. `src/web/features/catalog/pages/CatalogPage.test.tsx` — caso con imagen.
11. `scripts/tenant.ts` y `scripts/lib/wrangler.ts` — opción `--logo <ruta>`, `kvPutFile`, `kvDelete`.
12. `README.md` — creación del namespace KV y carga de logos.

---

## Tareas (Orden Topológico)

### T01 — Detección de tipo y almacenamiento

**Qué hacer:**
1. `detectImageType(bytes: Uint8Array)` devuelve `'image/jpeg'` (FF D8 FF), `'image/png'` (89 50 4E 47 0D 0A 1A 0A), `'image/webp'` (`RIFF` en 0–3 y `WEBP` en 8–11) o `null`.
2. `image-store.ts`: `get` devuelve `{ body: ReadableStream, contentType } | null`.
3. `kv-image-store.ts`:
   - `put` usa `metadata: { contentType }`;
   - `get` usa `getWithMetadata(key, { type: 'stream', cacheTtl: 2592000 })`;
   - `delete` borra la clave.

   Factoría `createImageStore(env)`.
4. `images.service.ts`:
   - `saveProductImage(store, tenantId, thumb: ArrayBuffer, full: ArrayBuffer)`, que valida cada variante:
     - > 1 MB → `ApiError(413, 'PAYLOAD_TOO_LARGE', 'La imagen supera 1 MB')`;
     - tipo distinto de JPEG/WebP → `ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Formato no soportado (usá JPG o WebP)')`.

     Genera la base `t/<tenantId>/<newId()>`, guarda `-480` y `-1200` con el tipo detectado y devuelve la base.
   - `deleteProductImageIfUnreferenced(db, store, tenantId, imageKey)`: si `countProductsByImageKey` es 0, borra ambas variantes.

**Criterio de validación:** `npm run test:unit` pasa `image-type.test.ts` (incluye un SVG en texto → `null` y un buffer de 3 bytes → `null`); `npm run test:worker` pasa `images.service.test.ts` (ver Tests Obligatorios).

**Depende de:** Ninguna.

### T02 — Endpoints de imágenes

**Qué hacer:**
1. `admin-images.routes.ts`: `POST /images` con `requireAdmin` y `sameOrigin`.
   - Lee el multipart (`c.req.parseBody()`) con los campos `thumb` y `full` (File). Si falta alguno → 400 `VALIDATION_ERROR`.
   - Llama a `saveProductImage` con el `tenantId` de la sesión y responde 201 `{ imageKey }`.
2. `images.routes.ts`: `GET /img/*`.
   - La clave es el resto del path y debe cumplir `^t/[0-9a-f-]{36}/(?:[0-9a-f-]{36}-(?:480|1200)|logo-[0-9a-f-]{36})$`; si no, 404.
   - Si no existe en el store → 404 `NOT_FOUND`.
   - Si existe → 200 con el stream, `Content-Type` desde la metadata, `Cache-Control: public, max-age=31536000, immutable` y `X-Content-Type-Options: nosniff`.
3. `admin-products.routes.ts`: liberar la imagen previa tras `PUT` (si cambió) y tras `DELETE`, con `waitUntil`. La validación de prefijo de `imageKey` (CAT-05) se mantiene.
4. `app.ts`: montar las rutas. `wrangler.jsonc`: namespace KV y `/img/*` en `run_worker_first`; ejecutar `npm run cf-typegen`.

**Criterio de validación:** `npm run test:worker` pasa `admin-images.routes.test.ts` e `images.routes.test.ts`.

**Depende de:** T01.

### T03 — Compresión y selector de foto en el panel

**Qué hacer:**
1. `image-compress.ts`: `compressImage(file): Promise<{ thumb: Blob; full: Blob }>`.
   - Decodificar con `createImageBitmap(file, { imageOrientation: 'from-image' })`. Si falla → `ImageDecodeError` con el mensaje "No pudimos leer la foto. Probá con otra (JPG o PNG)".
   - Para cada tamaño de `IMAGE_SIZES`: escalar el lado mayor sin agrandar y dibujar en un canvas (`OffscreenCanvas` si existe; si no, `document.createElement('canvas')`).
   - Codificar como `image/webp` calidad 0.8. Si el blob resultante no es `image/webp` (Safari), recodificar como `image/jpeg` calidad 0.82.
   - Si supera `MAX_IMAGE_BYTES`, reintentar una vez con calidad 0.6. Si sigue excediendo → error "La foto es demasiado pesada".
2. `ImagePicker.tsx`:
   - `<input type="file" accept="image/*">` sin `capture`, para poder elegir cámara o galería;
   - vista previa de la foto actual (`/img/<key>-480`) o de la nueva (object URL, liberado al desmontar);
   - estados "Optimizando foto…" y "Subiendo…", y el mensaje de error si falla;
   - al elegir: comprime, llama a `uploadProductImage` y ejecuta `onChange(imageKey)`;
   - botón "Quitar foto" → `onChange(null)`.
3. `ProductForm.tsx`: integrar `ImagePicker`; el botón Guardar se deshabilita mientras sube. `ProductListItem.tsx`: miniatura con `productImageUrl`.

**Criterio de validación:** `npm run test:unit` pasa `image-compress.test.ts` (canvas y `createImageBitmap` mockeados; caso del respaldo JPEG cuando WebP no está soportado) e `ImagePicker.test.tsx`.

**Depende de:** T02.

### T04 — Logo del tenant

**Qué hacer:**
1. `wrangler.ts`: `kvPutFile(key, file, contentType, target)` ejecuta `wrangler kv key put <key> --binding IMAGES --path <file> --metadata '{"contentType":"…"}' --local|--remote`. `kvDelete(key, target)`.
2. `tenant.ts`, opción `--logo <ruta>`:
   - lee el archivo; valida tipo PNG, JPEG o WebP con `detectImageType` y tamaño ≤ 300 KB;
   - obtiene el `id` y el `logo_key` actual del tenant con `d1Query`;
   - sube el archivo como `t/<id>/logo-<uuid>`;
   - actualiza `tenants.logo_key`;
   - borra el logo anterior si existía (si falla, solo avisa).
3. `TenantLayout.tsx` y `AgeGate.tsx`: `<img>` de 32 px con `alt=""` junto al nombre cuando hay `logoUrl`.

**Criterio de validación:** `npm run tenant -- upsert tenants/banned.json --logo <archivo de prueba>` en local deja `logo_key` cargado y el header muestra el logo; un `.svg` es rechazado con un mensaje claro.

**Depende de:** T01.

---

## Tests Obligatorios

### Test AC03 (con foto) — Alta con imagen visible en el catálogo
**Dado:** el admin de BANNED autenticado.

**Cuando:**
- sube `thumb` y `full` (bytes WebP mínimos válidos) y recibe `imageKey`;
- crea ICE STORM con ese `imageKey`.

**Entonces:**
- en el catálogo público, ICE STORM trae `image.thumb = '/img/<imageKey>-480'`;
- `GET /img/<imageKey>-480` responde 200 con `Content-Type: image/webp` y `Cache-Control` que contiene `immutable`.

**Implementación:** `admin-images.routes.test.ts`.

### Test AC01 (con foto) — La grilla muestra la foto
`CatalogPage.test.tsx`: con un producto con `image` en el mock, la tarjeta renderiza `<img>` con `src="/img/<key>-480"` y `loading="lazy"`; sin imagen, usa `/placeholder.svg`.

### Test E14 — Archivos rechazados
Cada caso con su respuesta:
- bytes de un SVG → 415 `UNSUPPORTED_MEDIA_TYPE`;
- variante de más de 1 MB → 413 `PAYLOAD_TOO_LARGE`;
- sin el campo `full` → 400;
- sin sesión → 401;
- `Origin` ajeno → 403.

**Implementación:** `admin-images.routes.test.ts`.

### Test AC05 (imágenes) — Imagen de otro tenant
Crear o editar un producto de `banned` con un `imageKey` de prefijo `t/<id de demo>/` → 400 `INVALID_IMAGE`. **Implementación:** `admin-images.routes.test.ts`.

### Test de liberación de imágenes
`images.service.test.ts`:
- `deleteProductImageIfUnreferenced` borra ambas variantes cuando ningún producto las usa;
- no borra nada cuando otro producto del tenant comparte la clave (caso duplicado).

### Test de rutas de imagen
`images.routes.test.ts`: una clave con formato inválido (p. ej. `/img/../secreto`) o inexistente → 404.

---

## Verificación Final

Automáticas:
1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` sin errores.

Manuales (celular real si es posible):
2. Con `npm run dev` expuesto en la red local o luego del despliegue:
   - desde un iPhone y desde un Android, elegir una foto de la galería al editar THE BLACK SHEEP;
   - la foto aparece en el panel y en `/banned`;
   - el peso de la variante 1200 es menor a 1 MB (verificar en las herramientas de red).
3. Paso humano de producción: `npx wrangler kv namespace create catalogo-images`, pegar el `id` en `wrangler.jsonc` y ejecutar `npm run deploy`.

---

## Qué Hacer al Terminar

1. Reportar archivos creados y modificados, verificaciones y desvíos.
2. No commitear ni pushear sin instrucción explícita.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial del plan.
