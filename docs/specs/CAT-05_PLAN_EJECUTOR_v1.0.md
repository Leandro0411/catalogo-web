# Plan de Ejecución — CAT-05 Gestión de productos desde el panel (sin fotos)

## Metadatos

- **ID:** CAT-05 (fase A, 5 de 11)
- **Versión:** v1.0
- **Fecha:** 2026-09-14
- **Origen:** `docs/specs/CATALOGO_ARQUITECTO_v1.0.md` (D05, D07, D08, R04) y `docs/specs/ARQUITECTURA_DEL_SISTEMA.md`.
- **Destinatario:** Agente Ejecutor. Documento agnóstico de herramienta.
- **Base de código requerida:** CAT-02 y CAT-04 completos e integrados en `main` (y CAT-03 si ya está). Rama `cat-05-abm-productos`.
- **Stack y comandos:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:unit`, `npm run test:worker`, `npm run build`, `npm run dev`, `npm run admin`, `npm run seed:dev`.

---

## Misión

Permitir que el administrador autenticado liste, cree, edite, pause/active y elimine productos de **su** tenant desde un panel usable en el celular. El formulario se arma según el esquema de atributos de la categoría, e incluye un editor de opciones (sabores) con interruptor de disponibilidad. Los cambios se reflejan de inmediato en el catálogo público.

---

## Guardarraíles (No Negociables)

### Lo que NO se modifica
- `docs/specs/`, migraciones existentes, endpoints públicos y de auth (salvo reutilizar sus middlewares).

### Convenciones de código a respetar
- Las de CAT-01…CAT-04 y del Mapa §3/§6.
- **Aislamiento:** toda función de repositorio de administración recibe `tenantId` como parámetro obligatorio y lo usa en el `WHERE`. El `tenantId` sale de `c.get('admin')`. Un recurso de otro tenant responde **404**, igual que uno inexistente.
- Validación en dos niveles: Zod en la ruta (`productInputSchema`) y atributos contra el `attributeSchema` de la categoría (`validateAttributes` en `src/shared/domain/attributes.ts`). La UI reutiliza ambos.
- El mapeo de filas a DTOs vive en un solo lugar (`src/worker/services/product-mappers.ts`), usado también por el catálogo público.

### Constraints técnicas
- Mutaciones con `requireAdmin` + `sameOrigin`; lecturas con `requireAdmin`.
- Sin fotos en esta tarea (el campo `imageKey` se acepta y valida, pero la UI de fotos llega en CAT-06).

---

## Entorno de Ejecución y Verificación

- **Arranque local:**
  ```bash
  npm run db:migrate:local
  npm run seed:dev
  npm run admin -- create --tenant banned --username leandro
  npm run admin -- create --tenant demo --username demo
  npm run dev
  ```
- **Datos de prueba:** fixtures de CAT-02 y factories.

---

## Archivos a Crear

1. `src/shared/schemas/product.schema.ts` + `.test.ts` — `productInputSchema`, `statusInputSchema`.
2. `src/worker/services/product-mappers.ts` — `parseCategoryRow`, `parseProductRow`, `toPublicProduct`, `toAdminProduct`, `toAdminCategory`.
3. `src/worker/services/products.service.ts`.
4. `src/worker/routes/admin-products.routes.ts` + `admin-products.routes.test.ts`.
5. `src/web/features/admin/hooks/useAdminProducts.ts`.
6. `src/web/features/admin/lib/product-form.ts` + `.test.ts` — estado del formulario ↔ `ProductInput`.
7. `src/web/features/admin/components/ProductListItem.tsx`, `ProductForm.tsx`, `AttributeField.tsx`, `ChoicesEditor.tsx` + `ChoicesEditor.test.tsx`, `Switch.tsx`.
8. `src/web/features/admin/pages/ProductsPage.tsx` + `.test.tsx`, `ProductFormPage.tsx` + `.test.tsx`.

## Archivos a Modificar

1. `src/shared/types/api.types.ts` — `AdminCategory`, `AdminProduct` (incluye `choices: Choice[]` completos, `hiddenReason`, `updatedAt`), `ProductInput` (inferido del esquema).
2. `src/shared/domain/attributes.ts` + test — `validateAttributes(schema, values)`.
3. `src/shared/domain/money.ts` + test — `parseMoneyInput(text): number | null` (en centavos).
4. `src/worker/repositories/products.repo.ts` — `listProductsByTenant`, `findProductForTenant`, `insertProduct`, `updateProduct`, `updateProductStatus`, `deleteProductForTenant`.
5. `src/worker/repositories/categories.repo.ts` — `findCategoryForTenant(db, tenantId, categoryId)`.
6. `src/worker/services/catalog.service.ts` — usar `product-mappers.ts` (sin cambiar la respuesta).
7. `src/worker/app.ts` — montar `admin-products.routes` en `/api/admin`.
8. `src/web/api/admin.api.ts` — `listCategories`, `listProducts`, `getProduct`, `createProduct`, `updateProduct`, `setProductStatus`, `deleteProduct`.
9. `src/web/features/admin/admin-routes.tsx` — índice `/admin` → `ProductsPage`; `/admin/productos/nuevo` y `/admin/productos/:id` → `ProductFormPage`. Eliminar `AdminHomePage.tsx`.

---

## Tareas (Orden Topológico)

### T01 — Validaciones compartidas

**Qué hacer:**
1. `productInputSchema`:
   - `categoryId`: uuid;
   - `name`: recortado, 1 a 80 caracteres;
   - `description`: hasta 500, nullable;
   - `imageKey`: string `^t/[0-9a-f-]{36}/[0-9a-f-]{36}$`, nullable;
   - `priceCents`: entero entre 0 y 10¹²;
   - `currency`;
   - `priceNote`: hasta 60, nullable;
   - `stockMode`;
   - `stockQty`: entero ≥ 0, nullable;
   - `status`;
   - `attributes`: record de string | number;
   - `choices`: array de `choiceSchema`, máx. 50, valores únicos sin distinguir mayúsculas.

   Refinamientos:
   - `stockMode = quantity` exige `stockQty` no nulo; los demás modos exigen `stockQty = null`;
   - `status = sold` solo con `stockMode = unit`.

   `statusInputSchema = { status }`.
2. `validateAttributes(schema, values)` → `{ ok: true, value }` o `{ ok: false, errors: Record<key, mensaje> }`. Reglas:
   - clave desconocida → "Atributo desconocido";
   - requerido vacío → "Obligatorio";
   - `number` debe ser finito y ≥ 0 → "Debe ser un número";
   - `enum` fuera de `options` → "Valor no permitido";
   - `text` recortado, ≤ 60;
   - los opcionales vacíos se omiten.
3. `parseMoneyInput`:
   - acepta `26000`, `26.000`, `26.000,50`, `735`, `735,5` y `735.5` (punto decimal solo con 1–2 decimales y sin separador de miles);
   - devuelve centavos, o `null` si es inválido o negativo.

**Criterio de validación:** `npm run test:unit` pasa los tests de los tres archivos, con un caso por regla.

**Depende de:** Ninguna.

### T02 — Repositorios, mappers y servicio

**Qué hacer:**
1. `product-mappers.ts`: parseo de las columnas JSON con `parseJsonColumn` y conversión a DTOs. `toAdminProduct` calcula `hiddenReason` con `getHiddenReason`. `catalog.service.ts` pasa a usar `toPublicProduct` (los tests existentes deben seguir en verde).
2. Repositorios: todas las funciones de admin llevan `tenantId` y `WHERE … AND tenant_id = ?`. `updateProduct` y `updateProductStatus` fijan `updated_at = datetime('now')`.
3. `products.service.ts`:
   - `listProducts(db, tenantId)`: categorías y productos (todos los estados), ordenados por categoría, `sort_order` y nombre.
   - `getProduct(db, tenantId, id)`: si no existe → `ApiError(404, 'PRODUCT_NOT_FOUND', 'Producto no encontrado')`.
   - `createProduct(db, tenantId, input)`:
     - categoría del tenant obligatoria → si no, `ApiError(400, 'INVALID_CATEGORY', 'La categoría no existe')`;
     - atributos inválidos → `ApiError(400, 'VALIDATION_ERROR', 'Revisá los datos', { attributes: errors })`;
     - si la categoría no tiene `choiceLabel`, `choices` debe venir vacío (si no, `VALIDATION_ERROR` en `choices`);
     - `imageKey` debe empezar con `t/<tenantId>/` → si no, `ApiError(400, 'INVALID_IMAGE', 'Imagen inválida')`;
     - inserta con `newId()` y devuelve `AdminProduct`.
   - `updateProduct(db, tenantId, id, input)`: mismas validaciones, 404 si no existe. Devuelve `{ product, previousImageKey }` (CAT-06 usa `previousImageKey`).
   - `setProductStatus(db, tenantId, id, status)`: `sold` solo para `unit`; si no, `VALIDATION_ERROR`.
   - `deleteProduct(db, tenantId, id)`: 404 si no existe. Devuelve el `imageKey` borrado (para CAT-06).

**Criterio de validación:** `npm run typecheck` sin errores y `npm run test:worker` sigue en verde (catálogo público sin regresiones).

**Depende de:** T01.

### T03 — Endpoints de administración

**Qué hacer:** `admin-products.routes.ts`, todas con `requireAdmin`:

| Método y ruta | Middleware extra | Respuesta |
|---|---|---|
| `GET /categories` | — | `AdminCategory[]` |
| `GET /products` | — | `AdminProduct[]` |
| `GET /products/:id` | — | `AdminProduct` |
| `POST /products` | `sameOrigin` | 201 + `AdminProduct` |
| `PUT /products/:id` | `sameOrigin` | 200 + `AdminProduct` |
| `PATCH /products/:id/status` | `sameOrigin` | 200 + `AdminProduct` |
| `DELETE /products/:id` | `sameOrigin` | 204 |

Montar en `app.ts`.

**Criterio de validación:** `npm run test:worker` pasa `admin-products.routes.test.ts` (ver Tests Obligatorios).

**Depende de:** T02.

### T04 — Panel: listado

**Qué hacer:**
1. `useAdminProducts.ts`: carga categorías y productos. Expone `toggleStatus(id)` con actualización optimista y reversión si falla, `remove(id)` y `reload`.
2. `Switch.tsx`: interruptor accesible (`role="switch"`, `aria-checked`).
3. `ProductListItem.tsx`:
   - miniatura (placeholder), nombre, precio con `formatMoney`;
   - insignia si `hiddenReason`: "No visible · Pausado / Vendido / Sin stock / Sin opciones disponibles";
   - `Switch` "Disponible" (active ↔ paused);
   - botones "Editar" y "Eliminar", este último con confirmación `¿Eliminar "<nombre>"? Esta acción no se puede deshacer.`.
4. `ProductsPage.tsx`:
   - título "Productos", botón fijo "Nuevo producto" y buscador por nombre (sin acentos ni mayúsculas);
   - secciones por categoría con contador;
   - sin productos → "Todavía no cargaste productos";
   - muestra el mensaje de éxito recibido por `location.state` al volver del formulario.

**Criterio de validación:** `npm run test:unit` pasa `ProductsPage.test.tsx`.

**Depende de:** T03.

### T05 — Panel: formulario dinámico

**Qué hacer:**
1. `product-form.ts`:
   - `emptyFormState(category, tenantCurrency)`: moneda = `category.defaultCurrency ?? tenantCurrency`, `stockMode = category.defaultStockMode`, `status = 'active'`;
   - `formStateFromProduct(product)`;
   - `toProductInput(state, category)` → `{ input }` o `{ errors }`, reutilizando `productInputSchema`, `validateAttributes` y `parseMoneyInput`.
2. `AttributeField.tsx`: `text` → input; `number` → input `inputMode="numeric"` con sufijo de unidad; `enum` → select. Marca de obligatorio y mensaje de error.
3. `ChoicesEditor.tsx`:
   - filas con `Switch` de disponible, valor y botón quitar;
   - input "Agregar" (también con Enter);
   - opción "Pegar varios": textarea, uno por línea, agrega sin duplicados sin distinguir mayúsculas, y avisa los repetidos;
   - contador "N disponibles de M";
   - título con `pluralize(choiceLabel)` (p. ej. "Sabores").
4. `ProductForm.tsx`:
   - Categoría (select); al cambiarla se resetean atributos y opciones y se aplican los valores por defecto;
   - Nombre;
   - Precio (texto `inputMode="decimal"`) y Moneda (ARS/USD);
   - Nota de precio (opcional);
   - Atributos (uno por definición);
   - Opciones (solo si la categoría tiene `choiceLabel`);
   - Descripción (opcional);
   - "Disponible" (`Switch` active/paused);
   - bloque "Foto: disponible próximamente" (CAT-06);
   - botones "Guardar" y "Cancelar".

   Los errores de la API (`details`) se muestran junto a cada campo.
5. `ProductFormPage.tsx`: modo alta o edición según la ruta. Al guardar navega a `/admin` con `state: { message: 'Producto guardado' }`.

**Criterio de validación:** `npm run test:unit` pasa `product-form.test.ts`, `ChoicesEditor.test.tsx` y `ProductFormPage.test.tsx`.

**Depende de:** T04.

---

## Tests Obligatorios

### Test AC03 — Alta de producto desde el panel
**Dado:** el admin de BANNED autenticado.

**Cuando:** `POST /api/admin/products` con:
- `name: 'ICE STORM'`, `priceCents: 2800000`, `currency: 'ARS'`, `stockMode: 'availability'`, `status: 'active'`;
- `attributes: { puffs: 25000 }`;
- `choices` "Mint / Menthol" y "Mango / Piña", ambas disponibles.

**Entonces:**
- 201;
- el catálogo público de `banned` incluye ICE STORM con esos datos;
- el de `demo` no lo incluye.

**Implementación:** `admin-products.routes.test.ts` (sin foto; con foto en CAT-06).

### Test AC02 — Marcar como no disponible desde el panel
**Dado:** THE BLACK SHEEP activo. **Cuando:** `PATCH …/status` con `paused`. **Entonces:** desaparece del catálogo público; con `active` vuelve a aparecer. **Implementación:** `admin-products.routes.test.ts`.

### Test AC05 — Aislamiento entre tenants
**Dado:** productos en `banned` y en `demo`, y la sesión del admin de `banned`.

**Entonces:**
- `GET /products` lista solo productos de `banned`;
- `GET`, `PUT`, `PATCH /status` y `DELETE` sobre un producto de `demo` responden 404 `PRODUCT_NOT_FOUND`;
- el producto de `demo` queda intacto en la base.

**Implementación:** `admin-products.routes.test.ts`.

### Test E12 — Datos inválidos
Cada uno de estos casos responde 400:
- sin `puffs` (requerido) → `VALIDATION_ERROR` con `details.attributes.puffs`;
- `priceCents: -1`;
- `choices` en una categoría sin `choiceLabel`;
- `status: 'sold'` con `stockMode: 'availability'`.

**Implementación:** `admin-products.routes.test.ts`.

### Test E13 — Categoría de otro tenant
`POST` con el `categoryId` de una categoría de `demo` → 400 `INVALID_CATEGORY`. **Implementación:** `admin-products.routes.test.ts`.

### Tests de acceso y visibilidad
- Sin sesión → 401; `POST` sin `Origin` → 403.
- Un producto con todas las opciones apagadas figura con `hiddenReason: 'NO_CHOICES_AVAILABLE'` en `GET /products`.

### Tests de UI
- `ProductsPage.test.tsx`: agrupa por categoría; el switch llama a `PATCH` y actualiza la insignia; ante un error vuelve al estado anterior.
- `ProductFormPage.test.tsx`: alta con categoría Vapes, nombre, precio `28.000`, puffs `25000` y dos sabores → el cuerpo del `POST` es el esperado (`priceCents: 2800000`) y navega a `/admin`.
- `ChoicesEditor.test.tsx`: pegar tres líneas con un duplicado agrega dos y avisa el repetido; el switch cambia `available`.

---

## Verificación Final

Automáticas:
1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` sin errores.

Manuales (celular o vista móvil del navegador):
2. Login como `leandro` y alta de ICE STORM ($28.000, 25.000 puffs, 2 sabores): aparece en `/banned` al recargar.
3. Apagar un sabor: desaparece del detalle público.
4. Pausar ICE STORM: desaparece de `/banned`.
5. Login como `demo`: no ve productos de BANNED.

---

## Qué Hacer al Terminar

1. Reportar archivos creados y modificados, verificaciones y desvíos.
2. No commitear ni pushear sin instrucción explícita.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial del plan.
