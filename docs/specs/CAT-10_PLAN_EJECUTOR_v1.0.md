# Plan de Ejecución — CAT-10 Filtros combinados y buscador

## Metadatos

- **ID:** CAT-10 (fase B, 10 de 11)
- **Versión:** v1.0
- **Fecha:** 2026-09-14
- **Origen:** `docs/specs/CATALOGO_ARQUITECTO_v1.0.md` (D11) y `docs/specs/CATALOGO_APPLE_ELICITADOR_NUEVO_v1.0.md` (Outcome 2, AC03).
- **Destinatario:** Agente Ejecutor. Documento agnóstico de herramienta.
- **Base de código requerida:** CAT-09 completo e integrado en `main`. Rama `cat-10-filtros`.
- **Stack y comandos:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:unit`, `npm run build`, `npm run dev`, `npm run seed:dev`.

---

## Misión

Agregar al catálogo público un buscador de texto y un panel de filtros generado a partir del esquema de atributos:
- selección múltiple, mínimo numérico y precio máximo por moneda;
- combinables con la categoría;
- estado guardado en la URL.

Todo el filtrado ocurre en el navegador y muestra solo los productos que cumplen todos los filtros.

---

## Guardarraíles (No Negociables)

### Lo que NO se modifica
- `docs/specs/`, el Worker, la API y las migraciones (esta tarea es solo `src/shared` y `src/web`).

### Convenciones de código a respetar
- Las de CAT-01…CAT-09 y del Mapa §3/§6.
- La lógica de filtrado es **pura** y vive en `src/shared/domain/filters.ts`; los componentes solo leen y escriben el estado.
- Los controles salen de `attributeSchema[].filter`: ningún componente conoce claves concretas (`bateria`, `capacidad`…).

### Constraints técnicas
- Semántica:
  - **AND** entre filtros distintos y **OR** entre valores de un mismo filtro de selección múltiple;
  - un producto sin el atributo no cumple un filtro activo sobre ese atributo;
  - el filtro de precio está atado a una moneda: excluye los productos de la otra moneda.
- Búsqueda: sin acentos ni mayúsculas; todas las palabras deben aparecer en nombre, categoría, valores de atributos u opciones.

---

## Entorno de Ejecución y Verificación

- **Arranque local:** `npm run db:migrate:local && npm run seed:dev && npm run dev`, abrir `/miphone`.
- **Datos de prueba:** fixtures de miphone (CAT-09).

---

## Archivos a Crear

1. `src/shared/types/filters.types.ts` — `CatalogFilters`, `FilterControl` (`multi` | `min` | `price`).
2. `src/shared/domain/filters.ts` + `filters.test.ts` — `normalizeText`, `buildFilterControls`, `applyFilters`, `filtersFromSearchParams`, `filtersToSearchParams`, `countActiveFilters`, `pruneFiltersForCategory`.
3. `src/web/features/catalog/hooks/useFilters.ts`.
4. `src/web/features/catalog/components/SearchBox.tsx`, `FilterPanel.tsx` + `FilterPanel.test.tsx`, `MultiChipFilter.tsx`, `MinValueFilter.tsx`, `PriceFilter.tsx`.
5. `src/web/shared/components/BottomSheet.tsx` — panel inferior accesible (foco atrapado, cierre con Escape).

## Archivos a Modificar

1. `src/web/features/catalog/pages/CatalogPage.tsx` + test — buscador, botón de filtros, contador de resultados y estado vacío.
2. `src/web/features/catalog/components/CategoryChips.tsx` — escribir `cat` a través de `useFilters`.

---

## Tareas (Orden Topológico)

### T01 — Dominio de filtros

**Qué hacer:**
1. `CatalogFilters`:
   ```
   {
     category: string | null;
     q: string;
     multi: Record<string, string[]>;
     min: Record<string, number>;
     priceMax: { currency: Currency; amountCents: number } | null;
   }
   ```
2. `normalizeText`: NFD, sin diacríticos, minúsculas, espacios colapsados.
3. `buildFilterControls(catalog, category)`, sobre los atributos con `filter` de la categoría elegida (o de todas si es `null`):
   - `multi`: opciones = valores presentes en productos visibles (en el orden de `options` si es enum; si no, alfabético);
   - `min`: rango `[mín, máx]` presente;
   - `price`: monedas presentes.

   Con la misma clave en varias categorías, se toma el `label` de la primera por `sortOrder`.
4. `applyFilters(products, categories, filters)` con la semántica de los guardarraíles.
5. Serialización en la URL: `cat`, `q`, `f_<clave>=v1,v2` (cada valor con `encodeURIComponent`), `min_<clave>=90`, `pmax=700` (unidades) y `pcur=USD`. `filtersFromSearchParams` ignora parámetros mal formados.
6. `pruneFiltersForCategory(filters, category, categories)`: al cambiar de categoría, descarta filtros de atributos que la nueva categoría no tiene.

**Criterio de validación:** `npm run test:unit -- src/shared/domain/filters.test.ts` en verde (ver Tests Obligatorios).

**Depende de:** Ninguna.

### T02 — Estado y controles

**Qué hacer:**
1. `useFilters()`: lee y escribe los filtros en la URL con `useSearchParams` (`replace: true`). Expone `filters`, `setCategory` (aplica `pruneFiltersForCategory`), `setQuery`, `toggleMulti`, `setMin`, `setPriceMax` y `clear`.
2. `SearchBox.tsx`: input `type="search"` con placeholder "Buscar…" y debounce de 200 ms.
3. `MultiChipFilter.tsx`: chips alternables (`aria-pressed`).
4. `MinValueFilter.tsx`:
   - con unidad `%`: select "Sin mínimo / 80% / 85% / 90% / 95% / 100%";
   - con otra unidad: `input type="range"` entre el mínimo y el máximo presentes, con el valor visible.
5. `PriceFilter.tsx`: input "Precio máximo" (`inputMode="numeric"`) y selector de moneda solo con las presentes; por defecto, la moneda del tenant.
6. `FilterPanel.tsx`: botón "Filtros (N)" que abre `BottomSheet` con los controles, "Limpiar filtros" y "Ver N resultados" (cierra el panel).

**Criterio de validación:** `npm run test:unit` pasa `FilterPanel.test.tsx`.

**Depende de:** T01.

### T03 — Integración en el catálogo

**Qué hacer:** en `CatalogPage.tsx`:
1. Mostrar `SearchBox` si el tenant tiene 6 productos visibles o más.
2. Mostrar `FilterPanel` si hay al menos un control de filtro.
3. Aplicar `applyFilters` memoizado y mostrar "N productos".
4. Si hay filtros activos y ningún resultado → `EmptyState` "No encontramos productos con esos filtros" con botón "Limpiar filtros".
5. Las secciones por categoría de CAT-09 muestran solo los productos filtrados y se ocultan las vacías.

**Criterio de validación:** `npm run test:unit` pasa `CatalogPage.test.tsx` con los nuevos casos.

**Depende de:** T02.

---

## Tests Obligatorios

### Test Apple AC03 — Filtro combinado por categoría, batería y precio
**Dado:** el catálogo de fixtures de miphone, más un "iPhone 15 (White) 96%" a 72000 USD.

**Cuando:** `category: 'iphone'`, `min.bateria: 95`, `priceMax: USD 700` (70000 centavos).

**Entonces:**
- el resultado es exactamente "iPhone 15 Pro 128GB (Black) 100%" (665) y "iPhone 14 Pro 128GB (Black) 100% AS IS" (570);
- quedan excluidos 87% y 84% (por batería), el de USD 720 (por precio) y el sellado sin batería.

Variante equivalente: sumar `multi.condicion: ['Usado', 'AS IS']` da el mismo resultado (adaptación GAP-02).

**Implementación:** `filters.test.ts`; en UI, `CatalogPage.test.tsx` aplica los tres filtros desde el panel y ve solo esos dos productos.

### Test E17 — Sin resultados
Filtros que no coinciden → "No encontramos productos con esos filtros"; "Limpiar filtros" restaura la lista completa y la URL queda sin parámetros de filtro. **Implementación:** `CatalogPage.test.tsx`.

### Test E18 — Precio en una moneda excluye la otra
Con `priceMax: USD 700` y sin categoría, el "Cargador completo certificado" (ARS) no aparece. **Implementación:** `filters.test.ts`.

### Tests de semántica y búsqueda
`filters.test.ts`:
- OR dentro de `condicion`; AND con `capacidad: ['128GB']`;
- un producto sin `bateria` queda excluido con `min.bateria` activo;
- `q: '15 pro'` encuentra "iPhone 15 Pro" e "iPhone 15 Pro Max";
- `q: 'PINA'` encuentra un valor "Piña" y `q: 'fundas'` encuentra "Fundas Silicona case";
- ida y vuelta `filtersToSearchParams` ↔ `filtersFromSearchParams` sin pérdida;
- `pruneFiltersForCategory` descarta `bateria` al pasar a `accesorios`.

### Test de visibilidad de controles
`CatalogPage.test.tsx`: BANNED (12 productos, sin atributos filtrables) muestra el buscador y no el botón "Filtros"; miphone muestra ambos.

---

## Verificación Final

Automáticas:
1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` sin errores.

Manuales (vista móvil):
2. En `/miphone`, aplicar iPhones + batería 95% + precio máx. USD 700 → quedan 2 productos; la URL refleja los filtros y, al compartirla, reproduce el resultado.
3. Buscar "pro max" encuentra el 15 Pro Max.
4. "Limpiar filtros" vuelve al catálogo completo.

---

## Qué Hacer al Terminar

1. Reportar archivos creados y modificados, verificaciones y desvíos.
2. No commitear ni pushear sin instrucción explícita.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial del plan.
