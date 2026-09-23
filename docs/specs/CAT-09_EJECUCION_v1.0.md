# Informe de Ejecución — CAT-09 Catálogo Apple por categorías, moneda mixta y Duplicar

## 0. Metadatos

- **ID Ticket:** CAT-09
- **Versión del informe:** v1.0
- **Fecha:** 2026-09-22
- **Producido por:** Desarrollador SDD (skill desarrollador-sdd)
- **Plan ejecutado:** `CAT-09_PLAN_EJECUTOR_v1.0.md`
- **Análisis de referencia:** `CATALOGO_ARQUITECTO_v1.0.md` (D05, D06, D09, D10, D27, GAP-02) y `CATALOGO_APPLE_ELICITADOR_NUEVO_v1.0.md` (§5)
- **Branch de trabajo:** `cat-09-catalogo-apple` (desde `main`, commit de partida `a05bd8a`)
- **Estado global:** COMPLETA
- **Commit(s) resultantes:** sin commitear — cambios en working tree, a la espera de confirmación

---

## 1. Resumen Ejecutivo

- Se dio de alta el tenant `miphone` con sus 5 categorías (iPhones, MacBooks, iPads, AirPods, Accesorios) y los datos de desarrollo de la planilla.
- Catálogo en secciones con chips por categoría (`?cat=`), atributos en tarjeta y nota de precio — el mecanismo de tarjetas/nota de precio ya existía del rediseño mobile (CAT-07/e07f79a); solo faltaba `priceNote` en el carrito, ya agregado.
- **Hallazgo importante:** el motor de moneda mixta del mensaje de WhatsApp ("Total en pesos" / "Total en USD") **ya estaba implementado y testeado genéricamente** antes de este ticket. AC05 se cubrió con un test específico de datos Apple sobre ese mecanismo existente, sin tocar `whatsapp.ts`.
- Acción "Duplicar" agregada en el panel: navega a `?from=<id>`, prellena el formulario y convierte `sold` en `active`; guarda con `POST`.
- Verificación final automática completa sin errores. Las 5 verificaciones manuales del plan se ejecutaron en el navegador integrado, con resultado exitoso en las cinco.
- Una desviación **menor**: hubo que extender `scripts/lib/product-sql.ts` (fuera de la lista original de archivos) para soportar `stockQty` y `priceNote` en las fixtures de desarrollo — sin eso, los productos "por cantidad" y con nota de precio del vertical Apple quedaban con `stock_qty` nulo (invisibles en el catálogo). Sin desviaciones mayores.

---

## 2. Estado por Tarea

| Tarea | Estado | Validación ejecutada | Resultado |
|---|---|---|---|
| T01 — Configuración de miphone y datos de desarrollo | COMPLETADA-VALIDADA | `npx vitest run tenant-files product-sql`; `npm run seed:dev` + consulta a D1 local | 4+4 tests verdes; `stock_qty`/`price_note` confirmados en la base |
| T02 — Catálogo por secciones y atributos | COMPLETADA-VALIDADA | `npx vitest run CatalogPage CartPage` | 9+5 tests verdes, incluidos los casos de secciones, chip, nota de precio y AC01 |
| T03 — Duplicar en el panel | COMPLETADA-VALIDADA | `npx vitest run ProductFormPage` | 2/2 tests verdes, incluido el caso de duplicado (sold→active, POST) |
| T04 — Criterios de Apple en el Worker y en el mensaje | COMPLETADA-VALIDADA | `npx vitest run --config vitest.workers.config.ts catalog.service.apple`; `npx vitest run whatsapp` | AC01/AC06: 2/2 verdes; AC05: 7/7 verdes (incluye el caso nuevo) |

---

## 3. Log de Desviaciones

| # | Tarea | Tipo | Qué decía el plan | Qué se encontró | Qué se hizo / Disposición |
|---|---|---|---|---|---|
| D1 | T01 | Menor | Archivos a modificar: solo `scripts/fixtures/dev-products.json` y `scripts/seed-dev.ts` | `scripts/lib/product-sql.ts` (`buildProductInsertSql`) no insertaba `stock_qty` ni `price_note`; las fixtures de MacBooks/Accesorios (modo `quantity`, con `priceNote` en "Fundas Silicona case") habrían quedado con stock `NULL`, invisibles en el catálogo (`visibility.ts` trata `stockQty ?? 0 <= 0` como sin stock) | Se extendió `DevProductFixture` y `buildProductInsertSql` con `stockQty`/`priceNote` opcionales, siguiendo el mismo patrón que las columnas existentes (mecánico, sin decisión de diseño) y se agregaron 2 tests. Verificado con una consulta directa a D1 local: los valores cargan correctamente |
| D2 | T02 | Menor | "ProductCard.tsx: atributos `showInCard` como chips... y `priceNote` bajo el precio" y "ProductPage.tsx: mostrar `priceNote`" | Ambos ya estaban implementados desde el rediseño mobile-first (CAT-07, commit `e07f79a`), previo a este plan | No se modificó ninguno de los dos archivos; se agregaron tests que confirman el comportamiento (Apple AC01, nota de precio en tarjeta). Solo `CartPage.tsx` necesitó el agregado de `priceNote`, que sí se hizo |
| D3 | T04 | Menor | "escribir `whatsapp.test.ts` ... según Tests Obligatorios. Corregir el código solo si algún criterio falla" | El mecanismo de totales por moneda ("Total en pesos"/"Total en USD") y el formato de línea (ref, nota de precio) ya estaban implementados y cubiertos por un test genérico anterior a este ticket | Se agregó el test AC05 con los datos Apple exactos del plan sobre el mecanismo existente; no se tocó `whatsapp.ts` |

Sin desviaciones mayores.

---

## 4. Tests Obligatorios

| Test (BDD del contrato) | Archivo del test | Resultado |
|---|---|---|
| Apple AC01 — Carga de unidad única con atributos (Worker) | `src/worker/services/catalog.service.apple.test.ts` | PASA |
| Apple AC01 — Carga de unidad única con atributos (UI) | `src/web/features/catalog/pages/CatalogPage.test.tsx` | PASA |
| Apple AC05 — Pedido con moneda mixta | `src/shared/domain/whatsapp.test.ts` | PASA |
| Apple AC06 — Actualización inmediata (`no-store`) | `src/worker/services/catalog.service.apple.test.ts` | PASA |
| Test de secciones — orden iPhones → MacBooks → Accesorios | `src/web/features/catalog/pages/CatalogPage.test.tsx` | PASA |
| Test de secciones — chip "Accesorios" filtra y pone `?cat=accesorios` | `src/web/features/catalog/pages/CatalogPage.test.tsx` | PASA |
| Test de secciones — BANNED (una categoría) sin chips | `src/web/features/catalog/pages/CatalogPage.test.tsx` | PASA |
| Test de nota de precio — "Fundas Silicona case" muestra "2x $16.000" | `src/web/features/catalog/pages/CatalogPage.test.tsx` | PASA |
| Test de Duplicar — `?from=<id>` prellena y guarda con `POST` | `src/web/features/admin/pages/ProductFormPage.test.tsx` | PASA |
| Test de configuración — `tenants/*.json` válidos contra `tenantConfigSchema` | `scripts/lib/tenant-files.test.ts` | PASA |

---

## 5. Verificación Final

| Verificación | Comando / Procedimiento | Resultado |
|---|---|---|
| Lint | `npm run lint` | Sin errores |
| Typecheck | `npm run typecheck` | Sin errores |
| Suite completa | `npm test` (`test:unit` + `test:worker`) | 186 + 62 = 248 tests, todos verdes |
| Build | `npm run build` | Compiló Worker y cliente sin errores |
| Manual 1 — `/miphone`: secciones, chips y tarjetas | Navegador integrado, `db:migrate:local` + `seed:dev` + login `miphone` | EJECUTADO: secciones "iPhones/MacBooks/Accesorios" con chips "Todos/iPhones/MacBooks/Accesorios"; tarjetas con capacidad, color, estado y batería (`87%`, `84%`, etc.) |
| Manual 2 — carrito con iPhone + cargador, dos totales, WhatsApp separado | Carrito de `/miphone` con "Cargador completo certificado" + "iPhone 14 128GB (Red) 100%" | EJECUTADO: totales `$22.000` / `USD 410` en el carrito; el mensaje de WhatsApp abierto mostró exactamente `Total en pesos: $22.000` y `Total en USD: USD 410`, con `[ref 6CC9A6]` en el ítem `unit` |
| Manual 3 — Panel `miphone`: Duplicar un iPhone, cambiar batería/color, guardar | "iPhone 13 128GB (Blue) 84%" → Duplicar → color "Midnight", batería 92 → Guardar | EJECUTADO: apareció como producto nuevo ("iPhones (7)"); el duplicado quedó con `Color: Midnight` y el original sin cambios |
| Manual 4 — `/banned` sin chips | Navegador integrado | EJECUTADO: grilla simple, sin chips, igual que antes de CAT-09 |

### Guion de smoke test manual
No quedan pasos pendientes: los 5 escenarios manuales del plan (incluida la carga inicial vía chips y el mensaje real de WhatsApp) se ejecutaron y observaron directamente durante esta sesión (arriba).

---

## 6. Archivos Tocados

Coincide con `git status` del branch `cat-09-catalogo-apple` contra `main`.

- **Creados:**
  - `tenants/miphone.json` — configuración del tenant Apple con sus 5 categorías.
  - `scripts/lib/tenant-files.test.ts` — valida todos los `tenants/*.json` contra `tenantConfigSchema`.
  - `src/web/features/catalog/components/CategoryChips.tsx` — chips "Todos" + categoría, gobernados por `?cat=`.
  - `src/web/features/catalog/components/CategorySection.tsx` — título + grilla por categoría.
  - `src/worker/services/catalog.service.apple.test.ts` — criterios AC01/AC06 de Apple sobre el Worker, con el tenant creado desde `tenants/miphone.json`.
- **Modificados:**
  - `scripts/fixtures/dev-products.json` y `scripts/seed-dev.ts` — productos y tenant de miphone.
  - `scripts/lib/product-sql.ts` y su test (D1) — soporte de `stockQty`/`priceNote` en las fixtures.
  - `src/web/features/catalog/pages/CatalogPage.tsx` y su test — secciones, chips, fallback a grilla simple.
  - `src/web/features/cart/pages/CartPage.tsx` y su test — `priceNote` bajo la línea.
  - `src/shared/domain/whatsapp.test.ts` — caso Apple AC05.
  - `src/web/features/admin/components/ProductListItem.tsx` — botón "Duplicar".
  - `src/web/features/admin/pages/ProductFormPage.tsx` (+test) y `src/web/features/admin/lib/product-form.ts` — prellenado desde `?from=<id>`, `sold`→`active`.
  - `src/web/features/admin/components/ProductForm.tsx` — prop `duplicate`.
  - `src/worker/test/factories.ts` — `insertTenantFromConfig`.
- **Fuera de las listas del plan:** `scripts/lib/product-sql.ts` y `scripts/lib/product-sql.test.ts` — ver desviación D1 en §3.

---

## 7. Hallazgos Fuera de Alcance

Ninguno.

---

## 8. Pendientes y Próximos Pasos

- [ ] Commit y push del branch `cat-09-catalogo-apple` — pendiente de confirmación del desarrollador.
- [ ] Pase opcional al `verificador-sdd` como gate previo al code review humano.
- [ ] CAT-10 (filtros combinados + buscador) es la siguiente tarea de la Fase B.

---

## CHANGELOG

- v1.0 (2026-09-22): Ejecución inicial del plan v1.0. Estado global: COMPLETA. Tareas: 4 completadas-validadas / 0 bloqueadas / 0 omitidas. Desviaciones: 3 menores, 0 mayores.
