# Informe de Ejecución — CAT-10 Filtros combinados y buscador

## 0. Metadatos

- **ID Ticket:** CAT-10
- **Versión del informe:** v1.0
- **Fecha:** 2026-09-22
- **Producido por:** Desarrollador SDD (skill desarrollador-sdd)
- **Plan ejecutado:** `CAT-10_PLAN_EJECUTOR_v1.0.md`
- **Análisis de referencia:** `CATALOGO_ARQUITECTO_v1.0.md` (D11) y `CATALOGO_APPLE_ELICITADOR_NUEVO_v1.0.md` (Outcome 2, AC03)
- **Branch de trabajo:** `cat-10-filtros` (desde `main`, commit de partida `ae97546`)
- **Estado global:** COMPLETA
- **Commit(s) resultantes:** sin commitear — cambios en working tree, a la espera de confirmación

---

## 1. Resumen Ejecutivo

- Dominio de filtros puro (`src/shared/domain/filters.ts`) con buscador sin acentos, controles derivados de `attributeSchema[].filter`, semántica AND/OR de los guardarraíles y serialización completa en la URL.
- Estado y controles (`useFilters`, `SearchBox`, chips, selector/range, precio) y su integración en `CatalogPage.tsx`: buscador desde 6 productos, botón "Filtros (N)" cuando hay algún control, contador de resultados, estado vacío con "Limpiar filtros", secciones vacías ocultas.
- Verificación final automática completa sin errores (274 tests).
- Las 3 verificaciones manuales se ejecutaron en el navegador integrado en vista móvil, con resultado exitoso en las tres — con una salvedad documentada en la desviación D2 (el conteo de resultados del escenario manual 2 difiere del texto del plan por un motivo aritmético, no por una falla del filtro).
- **Decisión de diseño necesaria y documentada** (D1): el control de precio se muestra solo cuando el tenant maneja más de una moneda en total (no en el alcance de la categoría elegida), para poder satisfacer a la vez el ejemplo de Apple (categoría `iphone`, monomoneda USD, con filtro de precio) y el criterio de "BANNED sin controles filtrables" (monomoneda ARS).
- Una desviación **menor** de archivos: no hizo falta tocar el Worker ni la API (tal como exige el guardarraíl); todo quedó en `src/shared` y `src/web`, sin desvíos de alcance.

---

## 2. Estado por Tarea

| Tarea | Estado | Validación ejecutada | Resultado |
|---|---|---|---|
| T01 — Dominio de filtros | COMPLETADA-VALIDADA | `npx vitest run filters.test` | 17/17 tests verdes |
| T02 — Estado y controles | COMPLETADA-VALIDADA | `npx vitest run FilterPanel` | 4/4 tests verdes |
| T03 — Integración en el catálogo | COMPLETADA-VALIDADA | `npx vitest run CatalogPage` | 14/14 tests verdes |

---

## 3. Log de Desviaciones

| # | Tarea | Tipo | Qué decía el plan | Qué se encontró | Qué se hizo / Disposición |
|---|---|---|---|---|---|
| D1 | T01 | Menor (decisión forzada por los propios tests del plan) | `FilterControl` incluye `price`, generado "sobre monedas presentes", sin especificar el alcance | Si el control de precio se genera solo con las monedas de la categoría elegida, BANNED (una sola categoría, ARS) queda igual que miphone visto por categoría única — pero el plan exige explícitamente que BANNED no tenga botón "Filtros" y que Apple AC03 sí tenga precio dentro de la categoría `iphone` (monomoneda USD). Ambos requisitos son incompatibles si el criterio es "monedas del alcance" | Se usa el criterio "el **tenant** maneja 2+ monedas en total" para decidir si el control existe, y "monedas presentes en el alcance actual" para qué opciones ofrece el selector. Verificado con test unitario y manualmente: miphone (mixto ARS/USD) ofrece precio incluso dentro de "iPhones" (solo USD); BANNED (monomoneda) no ofrece precio en ningún alcance |
| D2 | T01/manual | Menor | Test Apple AC03: "el resultado es **exactamente** iPhone 15 Pro (665) y iPhone 14 Pro AS IS (570)" con `category:iphone, min.bateria:95, priceMax:USD 700` | Con los datos reales de CAT-09, "iPhone 14 128GB (Red) 100%" (USD 410) **también** cumple `bateria:100 ≥ 95` y `precio:410 ≤ 700`; el resultado matemáticamente correcto son 3 productos, no 2. Se reprodujo tanto en `filters.test.ts` (con datos propios) como en la verificación manual contra los fixtures reales de miphone | Para el test unitario `filters.test.ts` se usó un dataset propio que reproduce exactamente los productos que el "Entonces" del plan menciona (sin incluir el de USD 410, que el plan no menciona ni para incluir ni para excluir), validando así la semántica AND descrita sin heredar la inconsistencia numérica del ejemplo. En la verificación manual (que sí usa los datos reales) se documenta el resultado real (3 productos) como correcto: el filtro aplica bien la semántica del guardarraíl, el plan simplemente omitió ese producto al enumerar el resultado esperado. No requiere corrección de código |

Sin desviaciones mayores. El guardarraíl "no se modifica el Worker/la API/las migraciones" se cumplió: todos los archivos tocados están en `src/shared` y `src/web`.

---

## 4. Tests Obligatorios

| Test (BDD del contrato) | Archivo del test | Resultado |
|---|---|---|
| Apple AC03 — Filtro combinado (dominio) | `src/shared/domain/filters.test.ts` | PASA (ver D2 sobre el dataset usado) |
| Apple AC03 — variante equivalente con `multi.condicion` | `src/shared/domain/filters.test.ts` | PASA |
| Apple AC03 — en UI, aplicar los tres filtros desde el panel | `src/web/features/catalog/pages/CatalogPage.test.tsx` | PASA |
| E17 — Sin resultados + "Limpiar filtros" sin parámetros en la URL | `src/shared/domain/filters.test.ts` (dominio) y `CatalogPage.test.tsx` (UI) | PASA |
| E18 — Precio en una moneda excluye la otra | `src/shared/domain/filters.test.ts` y `CatalogPage.test.tsx` | PASA |
| Semántica OR/AND, atributo faltante, búsqueda "15 pro", "PINA"/"fundas" | `src/shared/domain/filters.test.ts` | PASA |
| Ida y vuelta `filtersToSearchParams` ↔ `filtersFromSearchParams`, parámetros mal formados | `src/shared/domain/filters.test.ts` | PASA |
| `pruneFiltersForCategory` descarta `bateria` al pasar a `accesorios` | `src/shared/domain/filters.test.ts` | PASA |
| Test de visibilidad de controles (BANNED sin Filtros, miphone con ambos) | `src/web/features/catalog/pages/CatalogPage.test.tsx` | PASA |

---

## 5. Verificación Final

| Verificación | Comando / Procedimiento | Resultado |
|---|---|---|
| Lint | `npm run lint` | Sin errores |
| Typecheck | `npm run typecheck` | Sin errores |
| Suite completa | `npm test` (`test:unit` + `test:worker`) | 212 + 62 = 274 tests, todos verdes |
| Build | `npm run build` | Compiló Worker y cliente sin errores |
| Manual 1 (móvil) — iPhones + batería 95% + precio máx. USD 700 | Navegador integrado en 375×812, `/miphone` | EJECUTADO: quedan 3 productos (410, 570, 665 USD — ver D2), URL `?cat=iphone&min_bateria=95&pmax=700&pcur=USD`; al navegar directo a esa URL reproduce el mismo resultado |
| Manual 2 (móvil) — buscar "pro max" | `/miphone`, buscador | EJECUTADO: encuentra exactamente "iPhone 15 Pro Max 256GB (Natural) 87%" (1 producto) |
| Manual 3 (móvil) — "Limpiar filtros" | Panel de filtros abierto con búsqueda y filtros activos | EJECUTADO: vuelve a los 10 productos del catálogo completo, sin parámetros de filtro en la URL |

### Nota sobre la verificación manual
Durante la sesión, algunos clics simulados por coordenadas sobre el botón "Filtros" no abrieron el panel de forma consistente (posible artefacto de temporización del navegador integrado); el cierre y las interacciones dentro del panel sí respondieron a clics reales sin problema, y un evento de clic despachado directamente confirmó que el manejador de apertura funciona correctamente. No se detectó ninguna causa en el código de la aplicación.

---

## 6. Archivos Tocados

Coincide con `git status` del branch `cat-10-filtros` contra `main`.

- **Creados:**
  - `src/shared/types/filters.types.ts` — `CatalogFilters`, `FilterControl`.
  - `src/shared/domain/filters.ts` + `filters.test.ts` — dominio puro de filtros.
  - `src/web/features/catalog/hooks/useFilters.ts` — estado en la URL.
  - `src/web/features/catalog/components/SearchBox.tsx`, `FilterPanel.tsx` + test, `MultiChipFilter.tsx`, `MinValueFilter.tsx`, `PriceFilter.tsx`.
  - `src/web/shared/components/BottomSheet.tsx` — panel inferior accesible (foco atrapado, cierre con Escape).
- **Modificados:**
  - `src/web/features/catalog/pages/CatalogPage.tsx` + test — buscador, botón de filtros, contador, estado vacío, secciones filtradas.
  - `src/web/features/catalog/components/CategoryChips.tsx` — ahora recibe `activeKey`/`onSelect` en vez de leer `useSearchParams` directamente; `CatalogPage` lo conecta a `useFilters`.
- **Fuera de las listas del plan:** Ninguno.

---

## 7. Hallazgos Fuera de Alcance

Ninguno.

---

## 8. Pendientes y Próximos Pasos

- [ ] Commit y push del branch `cat-10-filtros` — pendiente de confirmación del desarrollador.
- [ ] Pase opcional al `verificador-sdd` como gate previo al code review humano.
- [ ] CAT-11 (producción de miphone + carga inicial) es la última tarea de la Fase B y del proyecto.
- [ ] Sugerido para el desarrollador: si en algún momento se agrega un atributo con `filter: 'max'`, `buildFilterControls` no genera control para él todavía (el tipo `FilterControl` del plan solo define `multi | min | price`); quedaría para un ticket futuro si se necesita.

---

## CHANGELOG

- v1.0 (2026-09-22): Ejecución inicial del plan v1.0. Estado global: COMPLETA. Tareas: 3 completadas-validadas / 0 bloqueadas / 0 omitidas. Desviaciones: 2 menores, 0 mayores.
