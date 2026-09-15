# Plan de Ejecución — CAT-09 Catálogo Apple por categorías, moneda mixta y Duplicar

## Metadatos

- **ID:** CAT-09 (fase B, 9 de 11)
- **Versión:** v1.0
- **Fecha:** 2026-09-14
- **Origen:** `docs/specs/CATALOGO_ARQUITECTO_v1.0.md` (D05, D06, D09, D10, D27, GAP-02) y `docs/specs/CATALOGO_APPLE_ELICITADOR_NUEVO_v1.0.md` (§5, planilla "Listado miphone.mza").
- **Destinatario:** Agente Ejecutor. Documento agnóstico de herramienta.
- **Base de código requerida:** CAT-03 y CAT-05 completos (idealmente también CAT-06 a CAT-08) e integrados en `main`. Rama `cat-09-catalogo-apple`.
- **Stack y comandos:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:unit`, `npm run test:worker`, `npm run build`, `npm run dev`, `npm run seed:dev`, `npm run tenant`.

---

## Misión

Dar de alta la configuración del tenant **miphone**: cinco categorías (iPhones, MacBooks, iPads, AirPods, Accesorios), cada una con sus atributos. Además:
- mostrar el catálogo en secciones por categoría, con chips para elegir categoría;
- mostrar atributos y nota de precio en tarjetas, detalle y carrito;
- verificar el pedido con productos en USD y en ARS;
- agregar la acción "Duplicar" en el panel para cargar rápido equipos similares.

---

## Guardarraíles (No Negociables)

### Lo que NO se modifica
- `docs/specs/`, migraciones, contratos de la API y la lógica de `cart.ts` y `whatsapp.ts` (solo se agregan tests; si un test de moneda mixta falla, corregir el dominio sin cambiar el formato definido en CAT-03).

### Convenciones de código a respetar
- Las de CAT-01…CAT-08 y del Mapa §3/§6.
- **Un vertical nuevo es configuración, no código:** los atributos de Apple viven en `tenants/miphone.json`. Ningún componente menciona "iPhone", "batería" ni otra clave de atributo concreta.

### Constraints técnicas
- Tenants con una sola categoría (BANNED) siguen viéndose como grilla simple, sin chips ni títulos de sección.

---

## Entorno de Ejecución y Verificación

- **Arranque local:**
  ```bash
  npm run db:migrate:local
  npm run seed:dev
  npm run admin -- create --tenant miphone --username miphone
  npm run dev
  ```
  `seed:dev` ahora incluye miphone.
- **Datos de prueba:** fixtures de miphone basadas en la planilla (ver T01).

---

## Archivos a Crear

1. `tenants/miphone.json`.
2. `scripts/lib/tenant-files.test.ts` — valida todos los `tenants/*.json` contra `tenantConfigSchema`.
3. `src/web/features/catalog/components/CategoryChips.tsx`, `CategorySection.tsx`.
4. `src/worker/services/catalog.service.apple.test.ts` — criterios de aceptación de Apple sobre el Worker.

## Archivos a Modificar

1. `scripts/fixtures/dev-products.json` y `scripts/seed-dev.ts` — tenant y productos de miphone.
2. `src/web/features/catalog/pages/CatalogPage.tsx` + test — secciones y chips con `?cat=`.
3. `src/web/features/catalog/components/ProductCard.tsx` — atributos `showInCard` como chips y `priceNote`.
4. `src/web/features/catalog/pages/ProductPage.tsx` — `priceNote`.
5. `src/web/features/cart/pages/CartPage.tsx` — `priceNote` bajo la línea.
6. `src/shared/domain/whatsapp.test.ts` — caso Apple AC05.
7. `src/web/features/admin/components/ProductListItem.tsx` — acción "Duplicar".
8. `src/web/features/admin/pages/ProductFormPage.tsx` + test y `lib/product-form.ts` — prellenado desde `?from=<id>`.

---

## Tareas (Orden Topológico)

### T01 — Configuración de miphone y datos de desarrollo

**Qué hacer:**
1. `tenants/miphone.json`: `slug: "miphone"`, `name: "miphone.mza"`, `primaryColor: "#0A84FF"`, `whatsapp: "5490000000002"` (provisorio, el real se carga en CAT-11), `currency: "USD"`, `ageGate: false`, `noindex: false`, y estas categorías:

   | key | name | sortOrder | defaultStockMode | defaultCurrency | attributeSchema |
   |---|---|---|---|---|---|
   | `iphone` | iPhones | 0 | unit | USD | `modelo` (text, requerido, filtro multi); `capacidad` (enum 64GB/128GB/256GB/512GB/1TB, requerido, multi, tarjeta); `color` (text, tarjeta); `condicion` label "Estado" (enum Sellado/Usado/AS IS, requerido, multi, tarjeta); `bateria` (number, unidad `%`, filtro min, tarjeta); `ciclos` (number) |
   | `macbook` | MacBooks | 1 | quantity | USD | `modelo` (text, requerido, multi); `chip` (text, tarjeta); `ram` (enum 8GB/16GB/24GB/32GB, tarjeta); `capacidad` label "Almacenamiento" (enum 256GB/512GB/1TB/2TB, multi, tarjeta); `color` (text); `condicion` (igual que iPhone) |
   | `ipad` | iPads | 2 | quantity | USD | `modelo` (text, requerido, multi); `capacidad` (enum 64GB…1TB, multi, tarjeta); `color` (text); `condicion` (igual que iPhone) |
   | `airpods` | AirPods | 3 | quantity | USD | `modelo` (text, requerido, multi); `condicion` (enum, requerido, multi, tarjeta) |
   | `accesorios` | Accesorios | 4 | quantity | ARS | sin atributos |

   Documentar en el README que los valores de "Estado" se cambian en el JSON sin tocar código (a confirmar con el emprendedor).
2. `scripts/fixtures/dev-products.json`, productos de miphone:
   - `iphone` (unit): "iPhone 15 Pro Max 256GB (Natural) 87%" 73500 USD {modelo "iPhone 15 Pro Max", 256GB, Natural, Usado, 87}; "iPhone 15 Pro 128GB (Black) 100%" 66500 USD {…, Usado, 100}; "iPhone 14 Pro 128GB (Black) 100% AS IS" 57000 USD {…, AS IS, 100}; "iPhone 14 128GB (Red) 100%" 41000 USD {…, Usado, 100}; "iPhone 13 128GB (Blue) 84%" 38000 USD {…, Usado, 84}; "iPhone 17 256GB (Sage)" 108000 USD {…, Sellado}.
   - `macbook` (quantity 2): "MacBook Air M3 13 16GB 512GB (Midnight)" 129900 USD.
   - `accesorios` (quantity): "Cargador completo certificado" 2200000 ARS, stock 5; "Fundas Silicona case" 1050000 ARS, stock 8, `priceNote` "2x $16.000".

   `seed-dev.ts` incluye `miphone`.
3. `tenant-files.test.ts`: cada archivo de `tenants/` es válido.

**Criterio de validación:** `npm run test:unit` pasa `tenant-files.test.ts`; `npm run seed:dev` carga miphone sin errores.

**Depende de:** Ninguna.

### T02 — Catálogo por secciones y atributos

**Qué hacer:**
1. `CategoryChips.tsx`: chips "Todos" + una por categoría con productos visibles, en `sortOrder`; la activa sale del query param `cat` (`useSearchParams`) y es desplazable en horizontal en el celular.
2. `CategorySection.tsx`: título de la categoría + grilla.
3. `CatalogPage.tsx`:
   - con más de una categoría con productos: chips + secciones (con `cat`, solo esa sección);
   - con una sola: grilla simple como hasta ahora.
4. `ProductCard.tsx`: atributos `showInCard` como chips (`256GB · Natural · Usado · 87%`) usando `formatAttributeValue`, y `priceNote` bajo el precio.
5. `ProductPage.tsx` y `CartPage.tsx`: mostrar `priceNote`.

**Criterio de validación:** `npm run test:unit` pasa `CatalogPage.test.tsx` con los casos nuevos (ver Tests Obligatorios).

**Depende de:** T01.

### T03 — Duplicar en el panel

**Qué hacer:**
1. `ProductListItem.tsx`: botón "Duplicar" → `navigate('/admin/productos/nuevo?from=<id>')`.
2. `product-form.ts`: `formStateFromProduct(product, { duplicate: true })`:
   - sin `id`;
   - `status: 'active'` (también si el original estaba `sold`);
   - conserva `imageKey`, atributos, opciones, precio, moneda y stock.
3. `ProductFormPage.tsx`: con `from`, carga el producto y prellena el formulario, con el aviso "Duplicando «<nombre>». Cambiá lo que corresponda y guardá." Al guardar hace `POST` (alta).

**Criterio de validación:** `npm run test:unit` pasa `ProductFormPage.test.tsx` con el caso de duplicado.

**Depende de:** T01.

### T04 — Criterios de Apple en el Worker y en el mensaje

**Qué hacer:** escribir `catalog.service.apple.test.ts` (tenant creado desde `tenants/miphone.json` importado como JSON en las factories) y el caso de `whatsapp.test.ts`, según Tests Obligatorios. Corregir el código solo si algún criterio falla.

**Criterio de validación:** `npm run test:worker` y `npm run test:unit` en verde.

**Depende de:** T01.

---

## Tests Obligatorios

### Test Apple AC01 — Carga de unidad única con atributos
**Dado:** el admin de miphone autenticado.

**Cuando:** crea en `iphone`:
- `name` "iPhone 15 Pro Max 256GB (Natural) 87%";
- `stockMode: 'unit'`, `priceCents: 73500`, `currency: 'USD'`;
- `attributes { modelo: 'iPhone 15 Pro Max', capacidad: '256GB', color: 'Natural', condicion: 'Usado', bateria: 87 }`.

**Entonces:** el catálogo público lo trae con `categoryKey: 'iphone'`, esos atributos y `USD`.

UI (`CatalogPage.test.tsx`): la tarjeta, dentro de la sección "iPhones", muestra "87%", "256GB", "Natural", "Usado" y "USD 735".

(Adaptación GAP-02: "categoría iPhone usado" = categoría `iphone` + `condicion: 'Usado'`.)

**Implementación:** `catalog.service.apple.test.ts` + `CatalogPage.test.tsx`.

### Test Apple AC05 — Pedido con moneda mixta
**Dado:**
- "iPhone 14 128 (Red) 100%" (`unit`, 41000 USD);
- "Cargador completo certificado" (`quantity`, 2200000 ARS).

**Cuando:** se arma el mensaje.

**Entonces:** contiene exactamente:
- `• 1 x iPhone 14 128 (Red) 100% [ref XXXXXX] — USD 410` (con el ref del id de prueba);
- `• 1 x Cargador completo certificado — $22.000`;
- `Total en pesos: $22.000` y `Total en USD: USD 410`.

No contiene una línea `Total:` combinada.

**Implementación:** `whatsapp.test.ts`.

### Test Apple AC06 — Actualización inmediata
**Dado:** un iPhone usado con `bateria: 84`.

**Cuando:** `PUT` con `bateria: 88` y nuevo precio.

**Entonces:** el siguiente `GET` del catálogo público devuelve 88 y el nuevo precio, con `Cache-Control: no-store`.

**Implementación:** `catalog.service.apple.test.ts`.

### Test de secciones
`CatalogPage.test.tsx`:
- con miphone, secciones en orden iPhones → MacBooks → Accesorios;
- el chip "Accesorios" deja solo accesorios y pone `?cat=accesorios`;
- con BANNED (una categoría) no hay chips.

### Test de nota de precio
La tarjeta de "Fundas Silicona case" muestra "2x $16.000".

### Test de Duplicar
`ProductFormPage.test.tsx`: `?from=<id>` prellena todos los campos (incluida la foto y un `status` `sold` convertido a `active`); guardar envía un `POST` con esos datos.

### Test de configuración
`tenant-files.test.ts`: `banned.json`, `demo.json` y `miphone.json` validan contra `tenantConfigSchema`.

---

## Verificación Final

Automáticas:
1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` sin errores.

Manuales:
2. `/miphone`: secciones por categoría; chips funcionando; tarjetas con batería y capacidad.
3. Carrito con un iPhone y un cargador: dos totales separados; el mensaje de WhatsApp los muestra por separado.
4. Panel como `miphone`: "Duplicar" un iPhone, cambiar batería y color, guardar → aparece como producto nuevo.
5. `/banned` sigue igual que antes (sin chips).

---

## Qué Hacer al Terminar

1. Reportar archivos creados y modificados, verificaciones y desvíos.
2. No commitear ni pushear sin instrucción explícita.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial del plan.
