# Plan de Ejecución — CAT-02 Catálogo público de solo lectura con aviso +18

## Metadatos

- **ID:** CAT-02 (fase A, 2 de 11)
- **Versión:** v1.0
- **Fecha:** 2026-09-14
- **Origen:** `docs/specs/CATALOGO_ARQUITECTO_v1.0.md` (§3.3 modelo, §3.4 reglas) y `docs/specs/ARQUITECTURA_DEL_SISTEMA.md`.
- **Destinatario:** Agente Ejecutor. Documento agnóstico de herramienta.
- **Base de código requerida:** CAT-01 completo e integrado en `main`. Trabajar en la rama `cat-02-catalogo-publico`.
- **Stack y comandos:** Node 22 + npm. `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:unit`, `npm run test:worker`, `npm run build`, `npm run db:migrate:local`, `npm run tenant`, `npm run dev`. Este plan agrega `seed:dev`.

---

## Misión

Mostrar en `/<slug>` la grilla de productos visibles del tenant, con foto (placeholder hasta CAT-06), nombre, atributos destacados, precio y sabores, más el detalle de cada producto. En los tenants con `ageGate` no se muestra nada del catálogo hasta aceptar el aviso +18.

---

## Guardarraíles (No Negociables)

### Lo que NO se modifica
- `docs/specs/`, `migrations/0001_tenants.sql` (solo se crean migraciones nuevas).
- El contrato del endpoint `GET /api/public/tenants/:slug/catalog` (`PublicCatalogResponse` de CAT-01): solo se completa, no se cambia su forma.

### Convenciones de código a respetar
- Las de CAT-01 y del Mapa §3/§6: capas routes → services → repositories; tipos, esquemas y constantes en archivos propios; SQL con `bind()`; errores con `ApiError`; tests colocados; identificadores en inglés y textos en español.
- La regla de visibilidad existe en **un solo lugar**: `src/shared/domain/visibility.ts`.
- Todo acceso a `localStorage` pasa por `src/web/shared/storage.ts`.

### Constraints técnicas
- Una sola ida y vuelta a D1 por pedido de catálogo (`db.batch`).
- Los datos semilla son solo locales: `seed:dev` rechaza `--remote`.

---

## Entorno de Ejecución y Verificación

- **Arranque local:** `npm run db:migrate:local && npm run seed:dev && npm run dev`.
- **Datos de prueba:** `scripts/fixtures/dev-products.json` (creado aquí) y factories de tests.
- **Servicios mockeados:** ninguno.

---

## Archivos a Crear

1. `migrations/0002_catalog.sql`.
2. `src/shared/schemas/catalog.schema.ts` + `.test.ts` — `attributeDefSchema`, `categoryConfigSchema`, `choiceSchema`.
3. `src/shared/domain/money.ts` + `.test.ts` — `formatMoney`.
4. `src/shared/domain/visibility.ts` + `.test.ts` — `getHiddenReason`, `isPubliclyVisible`.
5. `src/shared/domain/attributes.ts` + `.test.ts` — `formatAttributeValue` (CAT-05 agrega la validación).
6. `src/worker/lib/json.ts` — `parseJsonColumn(text, schema, fallback)`.
7. `src/worker/repositories/categories.repo.ts`, `src/worker/repositories/products.repo.ts`.
8. `scripts/seed-dev.ts`, `scripts/fixtures/dev-products.json`.
9. `scripts/lib/category-sql.ts` + `.test.ts`, `scripts/lib/product-sql.ts` + `.test.ts`.
10. `public/placeholder.svg` — silueta neutra de producto.
11. `src/web/shared/storage.ts` + `.test.ts`, `src/web/shared/storage-keys.ts`, `src/web/shared/text.ts` (`pluralize`), `src/web/shared/components/EmptyState.tsx`.
12. `src/web/features/catalog/components/AgeGate.tsx`, `ProductCard.tsx`, `ProductAttributes.tsx`.
13. `src/web/features/catalog/pages/CatalogPage.tsx` + `.test.tsx`, `ProductPage.tsx` + `.test.tsx`.
14. `src/web/features/catalog/lib/product-image.ts` — URL de imagen o placeholder.

## Archivos a Modificar

1. `src/shared/types/catalog.types.ts` — agregar `HiddenReason = 'PAUSED' | 'SOLD' | 'OUT_OF_STOCK' | 'NO_CHOICES_AVAILABLE'`.
2. `src/shared/schemas/tenant.schema.ts` — agregar `categories: z.array(categoryConfigSchema).default([])`.
3. `scripts/tenant.ts` — también hacer upsert de las categorías del JSON.
4. `tenants/banned.json`, `tenants/demo.json` — agregar categorías.
5. `src/worker/repositories/row.types.ts` — `CategoryRow`, `ProductRow`.
6. `src/worker/services/catalog.service.ts` — devolver categorías y productos visibles.
7. `src/worker/routes/public.routes.test.ts` — nuevos casos.
8. `src/worker/test/factories.ts` — `insertCategory`, `insertProduct`.
9. `src/web/features/tenant/TenantLayout.tsx` — integrar el aviso +18.
10. `src/web/router.tsx` — índice → `CatalogPage`; `p/:productId` → `ProductPage`.
11. `package.json` — script `seed:dev`: `tsx scripts/seed-dev.ts`.

---

## Tareas (Orden Topológico)

### T01 — Migración del catálogo

**Qué hacer:** crear `migrations/0002_catalog.sql`:
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  attribute_schema TEXT NOT NULL DEFAULT '[]',
  choice_label TEXT,
  default_stock_mode TEXT NOT NULL DEFAULT 'availability' CHECK (default_stock_mode IN ('availability','unit','quantity')),
  default_currency TEXT CHECK (default_currency IS NULL OR default_currency IN ('ARS','USD')),
  UNIQUE (tenant_id, key)
);
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  image_key TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL CHECK (currency IN ('ARS','USD')),
  price_note TEXT,
  stock_mode TEXT NOT NULL CHECK (stock_mode IN ('availability','unit','quantity')),
  stock_qty INTEGER CHECK (stock_qty IS NULL OR stock_qty >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','sold')),
  attributes TEXT NOT NULL DEFAULT '{}',
  choices TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_categories_tenant ON categories(tenant_id, sort_order);
CREATE INDEX idx_products_tenant_status ON products(tenant_id, status);
CREATE INDEX idx_products_category ON products(category_id);
```

**Criterio de validación:** `npm run db:migrate:local` aplica 0002 sin errores.

**Depende de:** Ninguna.

### T02 — Esquemas y dominio compartido

**Qué hacer:**
1. `catalog.schema.ts`:
   - `attributeDefSchema`:
     - `key` con regex `^[a-z][a-z0-9_]{0,29}$`; `label` de 1 a 40 caracteres;
     - `type`, más `unit`, `options`, `required`, `filter` y `showInCard`, todos opcionales;
     - refinamientos: `enum` exige `options` no vacío; `filter` `min`/`max` solo para `number`; `multi` solo para `text`/`enum`.
   - `categoryConfigSchema`:
     - `key` con regex `^[a-z0-9-]{2,30}$`; `name` de 1 a 40 caracteres; `sortOrder` (default 0);
     - `attributeSchema` (default `[]`, claves únicas);
     - `choiceLabel` (≤ 20, nullable, default `null`);
     - `defaultStockMode` (default `availability`) y `defaultCurrency` (nullable, default `null`).
   - `choiceSchema`: `value` recortado de 1 a 80 caracteres; `available` boolean.
2. `money.ts`: `formatMoney(cents, currency)` con separador de miles `.` y decimal `,` (es-AR). Muestra decimales solo si `cents % 100 !== 0`. Formato ARS → `$26.000`; USD → `USD 735`.
3. `visibility.ts`: `getHiddenReason(product, category)`, que recibe `{ status, stockMode, stockQty, choices }` y `{ choiceLabel }` y devuelve, en este orden:
   - `PAUSED` si `status = paused`;
   - `SOLD` si `status = sold`;
   - `OUT_OF_STOCK` si `stockMode = quantity` y `(stockQty ?? 0) <= 0`;
   - `NO_CHOICES_AVAILABLE` si `choiceLabel` no es null y ningún `choice.available`;
   - `null` en otro caso.

   `isPubliclyVisible` = `getHiddenReason(...) === null`.
4. `attributes.ts`: `formatAttributeValue(def, value)`. Números en es-AR; unidad `%` pegada (`87%`), otras con espacio (`30.000 puffs`); texto y enum tal cual.

**Criterio de validación:** `npm run test:unit` pasa los tests de los cuatro archivos, con al menos:
- `2600000 ARS` → `$26.000`; `73500 USD` → `USD 735`; `1050 ARS` → `$10,50`;
- un caso por cada `HiddenReason`;
- `enum` sin `options` rechazado.

**Depende de:** T01.

### T03 — Configuración de categorías y datos semilla

**Qué hacer:**
1. `tenant.schema.ts`: agregar `categories`.
2. `banned.json`: `"categories": [{ "key": "vapes", "name": "Vapes", "sortOrder": 0, "choiceLabel": "Sabor", "defaultStockMode": "availability", "defaultCurrency": "ARS", "attributeSchema": [{ "key": "puffs", "label": "Puffs", "type": "number", "unit": "puffs", "required": true, "showInCard": true }] }]`. `demo.json`: una categoría `{ "key": "general", "name": "General" }`.
3. `category-sql.ts`: `buildCategoryUpsertSql(tenantSlug, category, id)`. El `tenant_id` se toma de `(SELECT id FROM tenants WHERE slug = …)`, con `ON CONFLICT(tenant_id, key) DO UPDATE` de todos los campos salvo `id`. Las categorías que no están en el JSON no se borran; documentarlo en el README.
4. `tenant.ts`: el upsert ejecuta en un mismo archivo SQL el tenant y luego sus categorías.
5. `product-sql.ts`: `buildProductInsertSql(fixture, id)`. Resuelve `category_id` con un subselect por slug de tenant y key de categoría, y `tenant_id` por slug.
6. `fixtures/dev-products.json` (datos de desarrollo):

   | Tenant | Producto | Precio | Puffs | Estado | Sabores |
   |---|---|---|---|---|---|
   | banned | THE BLACK SHEEP | 2600000 ARS | 30000 | active | "Grape / Strawberry Kiwi 🍇🍓🥝" ✓, "Watermelon Ice 🍉🧊" ✓, "Peach Mango 🍑🥭" ✗ |
   | banned | NIGHT RIDER | 2400000 ARS | 20000 | **paused** | uno disponible |
   | banned | GHOST | 2200000 ARS | 15000 | active | todos no disponibles |
   | demo | Producto Demo | 100000 ARS | — | active | — |

   Todos con `stockMode: availability`.
7. `seed-dev.ts`: si recibe `--remote`, sale con error. Si no, arma un SQL con los upserts de `banned` y `demo`, borra los productos de ambos tenants e inserta los fixtures, y lo ejecuta en local.

**Criterio de validación:** `npm run test:unit` pasa `category-sql.test.ts` y `product-sql.test.ts`; `npm run seed:dev` ejecuta sin errores y re-ejecutarlo no duplica datos.

**Depende de:** T02.

### T04 — Catálogo en el Worker

**Qué hacer:**
1. `row.types.ts`: `CategoryRow`, `ProductRow` (columnas tal cual).
2. `json.ts`: `parseJsonColumn(text, schema, fallback)`. Si el JSON o el esquema fallan, loguea `warn` en JSON y devuelve `fallback`.
3. `categories.repo.ts`:
   - `listCategoriesStmt(db, slug)`: sentencia preparada que filtra por tenant activo con subselect por slug y ordena por `sort_order, name`.
   - `listCategoriesByTenant(db, tenantId)`, para el admin.
4. `products.repo.ts`: `listPublicProductsStmt(db, slug)` con `status = 'active' AND (stock_mode <> 'quantity' OR stock_qty > 0)`, ordenado por `sort_order, name`.
5. `catalog.service.ts`:
   - ejecutar `db.batch([tenantStmt, categoriesStmt, productsStmt])`;
   - si no hay tenant → 404 `TENANT_NOT_FOUND`;
   - parsear `attribute_schema`, `attributes` y `choices`;
   - filtrar con `isPubliclyVisible`;
   - mapear a `PublicProduct`: `choices` = solo valores disponibles; `image` = `{ thumb: '/img/<key>-480', full: '/img/<key>-1200' }` o `null`.
6. `factories.ts`: `insertCategory` e `insertProduct` con valores por defecto de BANNED.

**Criterio de validación:** `npm run test:worker` pasa los tests AC01, AC02, E03 y de aislamiento (ver Tests Obligatorios).

**Depende de:** T03.

### T05 — Aviso +18 y páginas del catálogo

**Qué hacer:**
1. `storage.ts`: `safeGet`, `safeSet` y `safeRemove`. Si `localStorage` lanza, usan un `Map` en memoria. `storage-keys.ts`: `ageOkKey(slug) = 'cat:age-ok:' + slug`, `cartKey(slug) = 'cat:cart:v1:' + slug`.
2. `AgeGate.tsx`: pantalla completa con color de marca, texto "Este catálogo es solo para mayores de 18 años. ¿Sos mayor de edad?" y botones "Soy mayor de 18" / "Soy menor de 18". Si elige "menor", muestra "Lo sentimos, este catálogo es solo para mayores de 18 años." y no ofrece continuar.
3. `TenantLayout.tsx`: si `tenant.ageGate` y `safeGet(ageOkKey(slug)) !== '1'`, renderiza `AgeGate` en lugar del `Outlet`, así no se montan productos ni imágenes. Al aceptar, guarda `'1'` y muestra el catálogo.
4. `product-image.ts`: `productImageUrl(product, 'thumb' | 'full')` → URL o `/placeholder.svg`.
5. `ProductCard.tsx`:
   - `Link` a `p/<id>`;
   - imagen `loading="lazy"` con `width`/`height` y `alt` = nombre;
   - nombre y atributos `showInCard` formateados;
   - `formatMoney` y `priceNote` si existe;
   - si hay sabores, "N sabores" (`pluralize(choiceLabel, n)` en minúscula: termina en vocal → `+s`; si no, `+es`).
6. `ProductAttributes.tsx`: lista `label: valor` según el `attributeSchema` de la categoría.
7. `CatalogPage.tsx`: toma los datos de `useTenant()`. Grilla de 2 columnas en móvil y 3–4 en escritorio, ordenada por categoría y luego producto. Sin productos → `EmptyState` "Todavía no hay productos disponibles".
8. `ProductPage.tsx`: busca el producto por `productId`. Muestra imagen `full`, nombre, precio, nota, atributos, descripción y la lista de valores disponibles bajo el título `choiceLabel`. Si no existe → "Producto no disponible" con link al catálogo.
9. `router.tsx`: índice de `/:slug` → `CatalogPage`; `/:slug/p/:productId` → `ProductPage`.

**Criterio de validación:** `npm run test:unit` pasa los tests de UI (ver Tests Obligatorios).

**Depende de:** T04.

---

## Tests Obligatorios

### Test AC01 — Ver catálogo público tras aceptar +18
**Worker (`public.routes.test.ts`).**
- **Dado:** BANNED con categoría `vapes` y THE BLACK SHEEP (2600000 ARS, `puffs: 30000`, sabor "Grape / Strawberry Kiwi 🍇🍓🥝" disponible).
- **Cuando:** se pide el catálogo.
- **Entonces:** el producto viene con `priceCents 2600000`, `currency 'ARS'`, `attributes.puffs 30000`, `choices ['Grape / Strawberry Kiwi 🍇🍓🥝']`, `categoryKey 'vapes'`, y la categoría trae `choiceLabel 'Sabor'`.

**UI (`CatalogPage.test.tsx`, fetch mockeado).**
- **Dado:** un visitante sin `cat:age-ok:banned`.
- **Cuando:** hace clic en "Soy mayor de 18".
- **Entonces:** ve "THE BLACK SHEEP", "$26.000" y "30.000 puffs", y `localStorage` guarda la aceptación. Antes del clic no aparece ningún nombre de producto.

### Test AC02 — Producto sin stock no se muestra
**Dado:** THE BLACK SHEEP con `status: 'paused'`. **Cuando:** se pide el catálogo de BANNED. **Entonces:** no aparece en `products`. **Implementación:** `public.routes.test.ts`.

### Test AC06 — Acceso sin login
Pedir el catálogo sin cookies devuelve 200 con productos visibles. **Implementación:** `public.routes.test.ts`.

### Test E02 — Menor de edad bloqueado
**Dado:** tenant con `ageGate`. **Cuando:** clic en "Soy menor de 18". **Entonces:** se ve el mensaje de bloqueo y ningún producto. **Implementación:** `CatalogPage.test.tsx`.

### Test E03 — Sabores no disponibles
**Dado:** GHOST con todos los sabores no disponibles, y THE BLACK SHEEP con uno no disponible. **Entonces:** GHOST no aparece y THE BLACK SHEEP lista solo los sabores disponibles. **Implementación:** `public.routes.test.ts`.

### Test de aislamiento — Productos de otro tenant
Un producto del tenant `demo` no aparece en el catálogo de `banned`. **Implementación:** `public.routes.test.ts`.

### Test de tenant sin aviso
El tenant `demo` (`ageGate: false`) muestra la grilla directamente. **Implementación:** `CatalogPage.test.tsx`.

### Test del detalle
`ProductPage.test.tsx`: muestra los sabores disponibles de THE BLACK SHEEP bajo el título "Sabor".

---

## Verificación Final

Automáticas:
1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` sin errores.

Manuales:
2. `npm run db:migrate:local && npm run seed:dev && npm run dev`, abrir `/banned` y verificar:
   - aparece el aviso +18; al aceptarlo se ven THE BLACK SHEEP con "$26.000" y "30.000 puffs";
   - NIGHT RIDER y GHOST no aparecen;
   - al recargar no vuelve a pedir el aviso;
   - en `/demo` no hay aviso.
3. Opcional: `npm run db:migrate:remote && npm run deploy` (en producción BANNED todavía no tiene productos → "Todavía no hay productos disponibles"). **No** ejecutar `seed:dev` contra remoto.

---

## Qué Hacer al Terminar

1. Reportar archivos creados y modificados, resultado de las verificaciones y desvíos del plan.
2. No commitear ni pushear sin instrucción explícita.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial del plan.
