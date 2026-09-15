# Plan de Ejecución — CAT-08 Stock por unidad y por cantidad

## Metadatos

- **ID:** CAT-08 (fase B, 8 de 11)
- **Versión:** v1.0
- **Fecha:** 2026-09-14
- **Origen:** `docs/specs/CATALOGO_ARQUITECTO_v1.0.md` (D08, GAP-01: la venta la registra el admin) y `docs/specs/ARQUITECTURA_DEL_SISTEMA.md`.
- **Destinatario:** Agente Ejecutor. Documento agnóstico de herramienta.
- **Base de código requerida:** CAT-05 completo e integrado en `main` (idealmente toda la fase A). Rama `cat-08-stock`.
- **Stack y comandos:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:unit`, `npm run test:worker`, `npm run build`, `npm run dev`, `npm run seed:dev`, `npm run tenant`.

---

## Misión

Permitir cargar productos como **unidad única** (se marca "Vendido" y desaparece del catálogo) o **por cantidad** (con "Registrar venta N" el stock baja en forma atómica; en 0 deja de listarse). Las ventas las registra siempre el administrador: el sistema no descuenta stock por los pedidos de WhatsApp.

---

## Guardarraíles (No Negociables)

### Lo que NO se modifica
- `docs/specs/`, migraciones existentes (el esquema ya tiene `stock_mode`, `stock_qty` y `status`), endpoints públicos y la regla de visibilidad (`visibility.ts` ya contempla `SOLD` y `OUT_OF_STOCK`).
- El carrito (`maxQtyFor` de CAT-03 ya limita a 1 en unidad y al stock en cantidad).

### Convenciones de código a respetar
- Las de CAT-01…CAT-07 y del Mapa §3/§6; aislamiento por `tenantId` en cada consulta.
- El descuento de stock es **una sola sentencia SQL condicional** (sin leer y luego escribir).

### Constraints técnicas
- `POST /api/admin/products/:id/sale` con `requireAdmin` + `sameOrigin`.

---

## Entorno de Ejecución y Verificación

- **Arranque local:**
  ```bash
  npm run db:migrate:local
  npm run seed:dev
  npm run tenant -- upsert tenants/demo.json
  npm run admin -- create --tenant demo --username demo
  npm run dev
  ```
  (El paso de `admin` solo hace falta si el usuario `demo` no existe.)
- **Datos de prueba:** `tenants/demo.json` suma dos categorías para probar a mano; los tests usan factories.

---

## Archivos a Crear

1. `src/web/features/admin/components/StockFields.tsx` + `StockFields.test.tsx`.
2. `src/web/features/admin/components/SaleDialog.tsx`.

## Archivos a Modificar

1. `src/shared/schemas/product.schema.ts` + test — `saleInputSchema = { qty: entero 1..999 }`.
2. `src/worker/repositories/products.repo.ts` — `registerQuantitySale(db, tenantId, id, qty)` y `markUnitSold(db, tenantId, id)`, que devuelven la cantidad de filas afectadas.
3. `src/worker/services/products.service.ts` — `registerSale(db, tenantId, id, qty)`.
4. `src/worker/routes/admin-products.routes.ts` + test — `POST /products/:id/sale`.
5. `src/worker/test/factories.ts` — helpers para productos `unit` y `quantity`.
6. `src/web/api/admin.api.ts` — `registerSale(id, qty)`.
7. `src/web/features/admin/hooks/useAdminProducts.ts` — acción `registerSale`.
8. `src/web/features/admin/components/ProductListItem.tsx` — acciones rápidas por modo y chip de stock.
9. `src/web/features/admin/pages/ProductsPage.tsx` + test — interruptor "Mostrar vendidos".
10. `src/web/features/admin/components/ProductForm.tsx` y `lib/product-form.ts` — integrar `StockFields`.
11. `tenants/demo.json` — categorías `unidades` (`defaultStockMode: unit`, `defaultCurrency: USD`) y `por-cantidad` (`defaultStockMode: quantity`).

---

## Tareas (Orden Topológico)

### T01 — Registro de ventas en el Worker

**Qué hacer:**
1. `saleInputSchema`.
2. `registerQuantitySale`:
   ```sql
   UPDATE products SET stock_qty = stock_qty - ?1, updated_at = datetime('now')
   WHERE id = ?2 AND tenant_id = ?3 AND stock_mode = 'quantity' AND stock_qty >= ?1
   ```
   `markUnitSold`:
   ```sql
   UPDATE products SET status = 'sold', updated_at = datetime('now')
   WHERE id = ?1 AND tenant_id = ?2 AND stock_mode = 'unit' AND status <> 'sold'
   ```
3. `registerSale(db, tenantId, id, qty)`:
   - carga el producto del tenant; si no existe → 404 `PRODUCT_NOT_FOUND`;
   - `availability` → `ApiError(400, 'SALE_NOT_SUPPORTED', 'Este producto no lleva stock')`;
   - `unit`:
     - `qty ≠ 1` → 400 `VALIDATION_ERROR`;
     - ya vendido → `ApiError(409, 'ALREADY_SOLD', 'La unidad ya está vendida')`;
     - si no → `markUnitSold`;
   - `quantity`: `registerQuantitySale`; con 0 filas afectadas → `ApiError(409, 'INSUFFICIENT_STOCK', 'No hay stock suficiente', { available })`.

   Devuelve el `AdminProduct` actualizado.
4. Ruta `POST /products/:id/sale` (`requireAdmin`, `sameOrigin`, `saleInputSchema`) → 200.

**Criterio de validación:** `npm run test:worker` pasa los tests de ventas (ver Tests Obligatorios).

**Depende de:** Ninguna.

### T02 — Formulario: modo de stock

**Qué hacer:**
1. `StockFields.tsx`:
   - selector de modo: "Disponible sí/no" (`availability`), "Unidad única" (`unit`), "Por cantidad" (`quantity`), inicializado con `category.defaultStockMode`;
   - en `quantity`, campo "Cantidad disponible" (entero ≥ 0, `inputMode="numeric"`);
   - estado:
     - en `unit`: Disponible / Pausado / Vendido;
     - en los demás modos: el switch Disponible de CAT-05.
2. `product-form.ts`: al cambiar a un modo distinto de `quantity`, `stockQty = null`; al pasar a `quantity`, `stockQty = 1` si estaba vacío; al salir de `unit`, `sold` pasa a `paused`.
3. `ProductForm.tsx`: integrar `StockFields` en lugar del manejo fijo de modo de CAT-05.

**Criterio de validación:** `npm run test:unit` pasa `StockFields.test.tsx` y `product-form.test.ts`, incluidas las transiciones de modo.

**Depende de:** T01.

### T03 — Panel: acciones rápidas

**Qué hacer:**
1. `SaleDialog.tsx`: diálogo accesible con la cantidad (por defecto 1, máximo el stock), botones "Registrar" y "Cancelar", y el mensaje del error 409.
2. `ProductListItem.tsx`:
   - `unit` activo → botón "Vendido" con confirmación "¿Marcar "<nombre>" como vendido? Dejará de verse en el catálogo." que registra la venta con `qty: 1`;
   - `unit` vendido → insignia "Vendido" y botón "Reactivar" (`PATCH status active`);
   - `quantity` → chip "Stock: N" y botón "Registrar venta" que abre `SaleDialog`; con N = 0, insignia "Sin stock".
3. `ProductsPage.tsx`: interruptor "Mostrar vendidos" (apagado por defecto) que oculta de la lista los `status = sold`.
4. `useAdminProducts.ts`: `registerSale(id, qty)` reemplaza el producto en la lista con la respuesta.

**Criterio de validación:** `npm run test:unit` pasa `ProductsPage.test.tsx` con los nuevos casos.

**Depende de:** T02.

---

## Tests Obligatorios

### Test Apple AC02 (reinterpretado) — Venta registrada de un ítem por cantidad
**Dado:** "Fundas Silicona case", `quantity`, 1050000 ARS, stock 8, activo.

**Cuando:** el admin registra una venta de 2 (`POST …/sale { qty: 2 }`).

**Entonces:**
- 200 con `stockQty: 6`;
- el catálogo público sigue listándolo con `stockQty: 6`.

**Implementación:** `admin-products.routes.test.ts`.

### Test Apple AC04 — Unidad vendida desaparece
**Dado:** una única unidad "iPhone 17 256GB (Sage)", `unit`, 10800000 USD, activa.

**Cuando:** el admin la marca vendida (`qty: 1`).

**Entonces:**
- `status: 'sold'`;
- ya no aparece en el catálogo público, incluso sin filtros;
- en `GET /api/admin/products` figura con `hiddenReason: 'SOLD'`.

**Implementación:** `admin-products.routes.test.ts`.

### Test de stock agotado
Con stock 1, una venta de 1 deja `stockQty: 0`: el producto sale del catálogo público y en el admin figura con `hiddenReason: 'OUT_OF_STOCK'`.

### Test E15 — Stock insuficiente
Con stock 2, una venta de 3 → 409 `INSUFFICIENT_STOCK` y el stock queda en 2.

Dos ventas simultáneas de 5 sobre stock 8 (`Promise.all`) → una 200 y una 409; el stock final es 3.

### Test E16 — Venta no aplicable
- `qty: 2` sobre una unidad → 400 `VALIDATION_ERROR`;
- venta sobre un producto `availability` → 400 `SALE_NOT_SUPPORTED`;
- venta sobre una unidad ya vendida → 409 `ALREADY_SOLD`.

### Test AC05 (ventas) — Aislamiento
Una venta sobre un producto de `demo` con la sesión de `banned` → 404; `POST` sin `Origin` → 403.

### Tests de UI
`ProductsPage.test.tsx`:
- "Registrar venta" con 2 actualiza el chip a "Stock: 6";
- "Vendido" muestra la insignia y, con "Mostrar vendidos" apagado, el ítem desaparece de la lista.

`StockFields.test.tsx`: el campo de cantidad aparece solo en "Por cantidad".

---

## Verificación Final

Automáticas:
1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` sin errores.

Manuales (panel como `demo`):
2. Crear una unidad en "Unidades" y marcarla "Vendido": desaparece de `/demo`.
3. Crear un ítem en "Por cantidad" con stock 3 y registrar una venta de 3: queda "Sin stock" y desaparece de `/demo`.
4. Con un ítem por cantidad de stock 2 en el carrito, intentar 3 unidades: el carrito limita a 2.

---

## Qué Hacer al Terminar

1. Reportar archivos creados y modificados, verificaciones y desvíos.
2. No commitear ni pushear sin instrucción explícita.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial del plan.
