# Informe de Ejecución — CAT-08 Stock por unidad y por cantidad

## 0. Metadatos

- **ID Ticket:** CAT-08
- **Versión del informe:** v1.0
- **Fecha:** 2026-09-22
- **Producido por:** Desarrollador SDD (skill desarrollador-sdd)
- **Plan ejecutado:** `CAT-08_PLAN_EJECUTOR_v1.0.md`
- **Análisis de referencia:** `CATALOGO_ARQUITECTO_v1.0.md` (D08, GAP-01)
- **Branch de trabajo:** `cat-08-stock` (desde `main`, commit de partida `4a42f88`)
- **Estado global:** COMPLETA
- **Commit(s) resultantes:** sin commitear — cambios en working tree, a la espera de confirmación

---

## 1. Resumen Ejecutivo

- Se implementaron las tres tareas del plan: registro de ventas en el Worker (T01), formulario con modo de stock (T02) y acciones rápidas en el panel (T03).
- La verificación final automática (`lint`, `typecheck`, `test`, `build`) corrió completa y sin errores.
- Las 4 verificaciones manuales del plan se ejecutaron con el panel `demo` en el navegador integrado, con resultado observado exitoso en las cuatro.
- Sin desviaciones mayores. Una desviación menor de implementación (ver §3), sin impacto en el contrato.
- Sin pendientes de diseño. Queda para el desarrollador decidir commit/push y el paso al `verificador-sdd`.

---

## 2. Estado por Tarea

| Tarea | Estado | Validación ejecutada | Resultado |
|---|---|---|---|
| T01 — Registro de ventas en el Worker | COMPLETADA-VALIDADA | `npm run test:worker` | 60/60 tests verdes, incluidos los 8 nuevos casos de venta |
| T02 — Formulario: modo de stock | COMPLETADA-VALIDADA | `npx vitest run --config vitest.config.ts product-form StockFields ProductForm` | 16/16 tests verdes, transiciones de modo incluidas |
| T03 — Panel: acciones rápidas | COMPLETADA-VALIDADA | `npx vitest run --config vitest.config.ts ProductsPage` | 5/5 tests verdes, incluidos los 2 casos nuevos del plan |

---

## 3. Log de Desviaciones

| # | Tarea | Tipo | Qué decía el plan | Qué se encontró | Qué se hizo / Disposición |
|---|---|---|---|---|---|
| D1 | T01 | Menor | `registerSale` "carga el producto del tenant" y devuelve el `AdminProduct` actualizado, sin especificar cómo construir la fila resultante | `setProductStatus` (patrón existente) construye la fila actualizada a mano combinando la fila previa con los campos nuevos | Para `registerSale` se optó por re-leer la fila con `findProductForTenant` después del UPDATE en vez de construirla a mano, evitando duplicar el cálculo de `stock_qty` y devolviendo siempre el estado real de la base tras la sentencia atómica (relevante bajo concurrencia) |

Sin desviaciones mayores.

---

## 4. Tests Obligatorios

| Test (BDD del contrato) | Archivo del test | Resultado |
|---|---|---|
| Apple AC02 (reinterpretado) — Venta registrada por cantidad | `src/worker/routes/admin-products.routes.test.ts` | PASA |
| Apple AC04 — Unidad vendida desaparece | `src/worker/routes/admin-products.routes.test.ts` | PASA |
| Test de stock agotado | `src/worker/routes/admin-products.routes.test.ts` | PASA |
| E15 — Stock insuficiente (incluye concurrencia con `Promise.all`) | `src/worker/routes/admin-products.routes.test.ts` | PASA |
| E16 — Venta no aplicable (unidad qty≠1, `availability`, unidad ya vendida) | `src/worker/routes/admin-products.routes.test.ts` | PASA |
| AC05 (ventas) — Aislamiento entre tenants y `sameOrigin` | `src/worker/routes/admin-products.routes.test.ts` | PASA |
| UI — "Registrar venta" actualiza el chip a "Stock: 6" | `src/web/features/admin/pages/ProductsPage.test.tsx` | PASA |
| UI — "Vendido" muestra la insignia y se oculta con "Mostrar vendidos" apagado | `src/web/features/admin/pages/ProductsPage.test.tsx` | PASA |
| UI — el campo de cantidad aparece solo en "Por cantidad" | `src/web/features/admin/components/StockFields.test.tsx` | PASA |

---

## 5. Verificación Final

| Verificación | Comando / Procedimiento | Resultado |
|---|---|---|
| Lint | `npm run lint` | Sin errores |
| Typecheck | `npm run typecheck` | Sin errores |
| Suite completa | `npm test` (`test:unit` + `test:worker`) | 172 + 60 = 232 tests, todos verdes |
| Build | `npm run build` | Compiló Worker y cliente sin errores |
| Manual 1 — Unidad "Vendido" desaparece de `/demo` | Panel `demo`: categoría "Unidades", producto "iPhone 17 256GB (Sage)" USD 1.200, click "Vendido" → confirmar | EJECUTADO: badge "No visible · Vendido" y botón "Reactivar" en el panel; el producto no aparece en `GET /demo` |
| Manual 2 — Ítem "Por cantidad" con stock 3, venta de 3 → "Sin stock" | Panel `demo`: categoría "Por cantidad", producto "Fundas Silicona case" $10.500, stock 3, "Registrar venta" → 3 → Registrar | EJECUTADO: chip pasa a "Stock: 0", badge "No visible · Sin stock"; desaparece de `/demo` |
| Manual 3 — Carrito limita a la cantidad de stock | Producto "Cargador Lightning" $5.000, stock 2, agregado al carrito público de `/demo`, "Sumar cantidad" x3 | EJECUTADO: la cantidad en el carrito quedó en 2, el tercer click no la incrementó |
| Manual 4 — Login y panel | Login como `demo` con la contraseña generada por `npm run admin -- create` | EJECUTADO: acceso correcto, categorías `unidades`/`por-cantidad` visibles y funcionales |

### Guion de smoke test manual
No quedan pasos pendientes: los 4 escenarios manuales del plan se ejecutaron y observaron directamente durante esta sesión (arriba).

---

## 6. Archivos Tocados

Coincide con `git diff --stat` del branch `cat-08-stock` contra `main`.

- **Creados:**
  - `src/web/features/admin/components/StockFields.tsx` — selector de modo de stock + campo de cantidad + estado según modo.
  - `src/web/features/admin/components/StockFields.test.tsx` — tests del componente.
  - `src/web/features/admin/components/SaleDialog.tsx` — diálogo accesible para registrar una venta por cantidad.
- **Modificados:**
  - `src/shared/schemas/product.schema.ts` (+`saleInputSchema`) y su test.
  - `src/worker/repositories/products.repo.ts` (+`registerQuantitySale`, +`markUnitSold`).
  - `src/worker/services/products.service.ts` (+`registerSale`).
  - `src/worker/routes/admin-products.routes.ts` (+`POST /products/:id/sale`) y su test (+8 casos).
  - `src/worker/test/factories.ts` (+`insertUnitProduct`, +`insertQuantityProduct`).
  - `src/web/api/admin.api.ts` (+`registerSale`).
  - `src/web/features/admin/hooks/useAdminProducts.ts` (+acción `registerSale`).
  - `src/web/features/admin/components/ProductListItem.tsx` (acciones rápidas por modo, chip de stock).
  - `src/web/features/admin/pages/ProductsPage.tsx` (+interruptor "Mostrar vendidos", +`SaleDialog`) y su test (+2 casos).
  - `src/web/features/admin/components/ProductForm.tsx` y `src/web/features/admin/lib/product-form.ts` (+`applyStockModeChange`, integración de `StockFields`) y su test (+5 casos).
  - `tenants/demo.json` (+categorías `unidades` y `por-cantidad`).
- **Fuera de las listas del plan:** Ninguno.

---

## 7. Hallazgos Fuera de Alcance

Ninguno.

---

## 8. Pendientes y Próximos Pasos

- [ ] Commit y push del branch `cat-08-stock` — pendiente de confirmación del desarrollador.
- [ ] Pase opcional al `verificador-sdd` como gate previo al code review humano.
- [ ] CAT-09 (tenant miphone por categorías, moneda mixta, Duplicar) es la siguiente tarea de la Fase B.

---

## CHANGELOG

- v1.0 (2026-09-22): Ejecución inicial del plan v1.0. Estado global: COMPLETA. Tareas: 3 completadas-validadas / 0 bloqueadas / 0 omitidas. Desviaciones: 1 menor, 0 mayores.
