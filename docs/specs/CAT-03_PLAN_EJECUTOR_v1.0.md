# Plan de Ejecución — CAT-03 Carrito local y pedido por WhatsApp

## Metadatos

- **ID:** CAT-03 (fase A, 3 de 11)
- **Versión:** v1.0
- **Fecha:** 2026-09-14
- **Origen:** `docs/specs/CATALOGO_ARQUITECTO_v1.0.md` (§3.4 carrito y mensaje, D12, D13) y `docs/specs/ARQUITECTURA_DEL_SISTEMA.md`.
- **Destinatario:** Agente Ejecutor. Documento agnóstico de herramienta.
- **Base de código requerida:** CAT-02 completo e integrado en `main`. Rama `cat-03-carrito-whatsapp`.
- **Stack y comandos:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:unit`, `npm run build`, `npm run dev`, `npm run seed:dev`.

---

## Misión

Permitir que el cliente agregue productos (con su sabor u opción y cantidad) a un carrito guardado en su navegador y confirme el pedido. Al confirmar se abre `wa.me/<número del tenant>` con un mensaje prellenado, con el detalle y los totales por moneda, calculado siempre contra el catálogo actualizado.

---

## Guardarraíles (No Negociables)

### Lo que NO se modifica
- `docs/specs/`, migraciones existentes y el Worker (esta tarea es solo `src/shared` y `src/web`).

### Convenciones de código a respetar
- Las de CAT-01/CAT-02 y del Mapa §3/§6.
- La lógica del carrito y del mensaje es **pura** y vive en `src/shared/domain/cart.ts` y `whatsapp.ts`. Los componentes no calculan totales ni arman textos.
- `localStorage` solo a través de `src/web/shared/storage.ts`.
- El carrito guarda **solo** `{ productId, choice, qty }`: precios, nombres y disponibilidad salen siempre del catálogo.

### Constraints técnicas
- Nunca se suman importes de monedas distintas.
- Límites: `MAX_QTY_PER_LINE = 50` y `MAX_CART_LINES = 30` en `src/shared/constants.ts`.

---

## Entorno de Ejecución y Verificación

- **Arranque local:** `npm run db:migrate:local && npm run seed:dev && npm run dev`.
- **Datos de prueba:** fixtures de CAT-02; los tests usan catálogos mockeados.
- **Limitación declarada:** la apertura real de la app de WhatsApp se verifica a mano en un celular (CAT-07).

---

## Archivos a Crear

1. `src/shared/types/cart.types.ts` — `CartLine`, `CartIssue`, `CartItem`, `CartSummary`, `AddLineResult`.
2. `src/shared/schemas/cart.schema.ts` — esquema del JSON persistido (`{ lines: CartLine[] }`).
3. `src/shared/domain/cart.ts` + `cart.test.ts` — `maxQtyFor`, `addLine`, `updateLineQty`, `removeLine`, `reconcileCart`.
4. `src/shared/domain/whatsapp.ts` + `whatsapp.test.ts` — `buildOrderMessage`, `buildWhatsAppUrl`, `productRef`.
5. `src/web/features/cart/cart.store.ts` + `cart.store.test.ts` — store por slug, compatible con `useSyncExternalStore`.
6. `src/web/features/cart/useCart.ts`.
7. `src/web/features/cart/components/AddToCart.tsx`, `CartButton.tsx`, `QtyStepper.tsx`.
8. `src/web/features/cart/pages/CartPage.tsx` + `CartPage.test.tsx`.

## Archivos a Modificar

1. `src/shared/constants.ts` — `MAX_QTY_PER_LINE`, `MAX_CART_LINES`.
2. `src/web/features/catalog/pages/ProductPage.tsx` — reemplazar la lista de valores por `AddToCart`.
3. `src/web/features/catalog/pages/ProductPage.test.tsx` — casos de agregado.
4. `src/web/features/tenant/TenantLayout.tsx` — `CartButton` en el header.
5. `src/web/router.tsx` — ruta `/:slug/carrito` → `CartPage`.

---

## Tareas (Orden Topológico)

### T01 — Dominio del carrito

**Qué hacer:**
1. Tipos:
   - `CartLine { productId: string; choice: string | null; qty: number }`;
   - `CartIssue = 'UNAVAILABLE' | 'CHOICE_UNAVAILABLE' | 'QTY_ADJUSTED'`;
   - `CartItem { line; product: PublicProduct | null; unitPriceCents; currency; subtotalCents; issue: CartIssue | null; valid: boolean }`;
   - `CartSummary { items; validItems; totals: Partial<Record<Currency, number>>; hasIssues }`;
   - `AddLineResult = 'added' | 'clamped' | 'cart-full'`.
2. `maxQtyFor(product)`: `unit` → 1; `quantity` → `stockQty ?? 0`; `availability` → `MAX_QTY_PER_LINE`.
3. `addLine(lines, input, product)`:
   - la clave de la línea es `productId + choice`; si ya existe, suma la cantidad;
   - recorta al máximo (`clamped`);
   - si agregaría una línea nueva con 30 líneas ya cargadas → `cart-full` y no modifica.

   Devuelve `{ lines, result }`. `updateLineQty` y `removeLine` son inmutables.
4. `reconcileCart(lines, catalog)`, por línea:
   - producto ausente → `UNAVAILABLE` (inválida);
   - la categoría tiene `choiceLabel` y `choice` no está en `product.choices` → `CHOICE_UNAVAILABLE` (inválida);
   - `maxQtyFor = 0` → `UNAVAILABLE`;
   - `qty > max` → se ajusta con `QTY_ADJUSTED` (válida).

   Los totales se calculan por moneda sobre las ítems válidas.

**Criterio de validación:** `npm run test:unit -- src/shared/domain/cart.test.ts` en verde (ver Tests Obligatorios).

**Depende de:** Ninguna.

### T02 — Mensaje y link de WhatsApp

**Qué hacer:**
1. `productRef(id)`: primeros 6 caracteres del UUID sin guiones, en mayúsculas.
2. `buildOrderMessage(tenantName, summary)`: solo con ítems válidas, con este formato exacto:
   ```
   ¡Hola BANNED! Quiero hacer este pedido:

   • 2 x THE BLACK SHEEP (Grape / Strawberry Kiwi 🍇🍓🥝) — $52.000
   • 1 x ICE STORM (Mint / Menthol) — $28.000

   Total: $80.000
   ```
   - Sin opción elegida, se omite el paréntesis.
   - Los productos `unit` agregan ` [ref XXXXXX]` después del nombre y la opción.
   - Si hay `priceNote`, se agrega ` — Nota: <nota>` al final de la línea.
   - Si hay más de una moneda, en lugar de `Total:` van `Total en pesos: …` y luego `Total en USD: …`.
   - Los importes se formatean con `formatMoney`.
3. `buildWhatsAppUrl(number, message)` = `https://wa.me/<número>?text=<encodeURIComponent(message)>`.

**Criterio de validación:** `npm run test:unit -- src/shared/domain/whatsapp.test.ts` en verde con strings exactos.

**Depende de:** T01.

### T03 — Store del carrito

**Qué hacer:**
1. `cart.schema.ts`: `cartStorageSchema = z.object({ lines: z.array(cartLineSchema).max(MAX_CART_LINES) })`, con `qty` entero entre 1 y `MAX_QTY_PER_LINE`.
2. `cart.store.ts`, por slug, con persistencia en `cartKey(slug)` vía `safeGet`/`safeSet`:
   - `getCartSnapshot(slug)`: referencia estable hasta el próximo cambio; si el JSON es inválido, carrito vacío;
   - `setCartLines(slug, lines)` y `subscribe(slug, listener)`;
   - escucha el evento `storage` para sincronizar pestañas.
3. `useCart(slug)`: `useSyncExternalStore` más las acciones `add`, `updateQty`, `remove`, `clear` y `count` (suma de cantidades).

**Criterio de validación:** `cart.store.test.ts` en verde (persistencia, JSON corrupto → vacío, E07).

**Depende de:** T01.

### T04 — UI de agregado y carrito

**Qué hacer:**
1. `QtyStepper.tsx`: botones − / + y valor, acotado a `[1, max]`, con `aria-label`.
2. `AddToCart.tsx` (en `ProductPage`):
   - si la categoría tiene `choiceLabel`, un grupo de radios con los valores disponibles bajo ese título;
   - `QtyStepper` con máximo `maxQtyFor(product)`;
   - botón "Agregar al carrito", deshabilitado hasta elegir una opción cuando corresponde (con la ayuda "Elegí un/a <choiceLabel en minúscula>");
   - al agregar, muestra "Agregado al carrito", "Ajustamos la cantidad al máximo disponible" o "Tu carrito está lleno", según el resultado.
3. `CartButton.tsx`: link a `carrito` con ícono y contador; se oculta el contador si es 0.
4. `CartPage.tsx`:
   - Al montar, pide el catálogo fresco con `getCatalog(slug)` (spinner). Si falla: "No pudimos verificar precios y stock. Reintentar", con el envío deshabilitado.
   - Reconcilia y muestra por ítem: nombre, opción, `QtyStepper` (si `max > 1`), precio unitario, subtotal y el aviso de la incidencia:
     - UNAVAILABLE → "Este producto ya no está disponible", con botón Quitar;
     - CHOICE_UNAVAILABLE → "Esta opción ya no está disponible", con botón Quitar;
     - QTY_ADJUSTED → "Ajustamos la cantidad al stock disponible".
   - Muestra los totales por moneda.
   - Botón "Enviar pedido por WhatsApp", deshabilitado sin ítems válidas. Al tocarlo: guarda las cantidades ajustadas, arma el mensaje y ejecuta `window.location.assign(buildWhatsAppUrl(tenant.whatsapp, message))`. Después muestra "¿Ya enviaste el pedido?" con el botón "Vaciar carrito".
   - Carrito vacío → `EmptyState` "Tu carrito está vacío" con link "Ver catálogo".
5. `TenantLayout.tsx`: `CartButton` en el header. `router.tsx`: ruta `carrito`.

**Criterio de validación:** `npm run test:unit` en verde, incluidos `CartPage.test.tsx` y `ProductPage.test.tsx`.

**Depende de:** T02, T03.

---

## Tests Obligatorios

### Test AC04 — Armado de pedido y redirección a WhatsApp
**Dado:** un carrito con 2 × THE BLACK SHEEP sabor "Grape / Strawberry Kiwi 🍇🍓🥝" (2600000 ARS) y 1 × ICE STORM sabor "Mint / Menthol" (2800000 ARS), y el tenant BANNED con WhatsApp `5490000000000`.

**Cuando:** se confirma el pedido.

**Entonces:** `buildOrderMessage` devuelve exactamente el texto del ejemplo de T02 (total `$80.000`), y la URL empieza con `https://wa.me/5490000000000?text=` y decodifica a ese texto.

**Implementación:**
- `whatsapp.test.ts` (texto exacto);
- `CartPage.test.tsx`: carrito precargado en `localStorage`, `fetch` mockeado y `window.location.assign` espiado; se verifica que la URL decodificada contiene ambas líneas y `Total: $80.000`.

### Test E04 — Carrito vacío
Sin líneas se ve "Tu carrito está vacío" y no hay botón de envío habilitado. **Implementación:** `CartPage.test.tsx`.

### Test E05 — Producto que dejó de estar disponible
**Dado:** una línea de un producto que ya no viene en el catálogo. **Entonces:**
- se ve "Este producto ya no está disponible";
- el mensaje no lo incluye;
- los totales lo excluyen.

**Implementación:** `cart.test.ts` + `CartPage.test.tsx`.

### Test E06 — Opción que dejó de estar disponible
Una línea con un sabor que ya no está en `product.choices` → `CHOICE_UNAVAILABLE`, excluida del mensaje. **Implementación:** `cart.test.ts` + `CartPage.test.tsx`.

### Test E07 — `localStorage` no disponible
Con `localStorage.setItem` y `getItem` lanzando excepción, `add` funciona en memoria y `count` refleja el agregado, sin errores no capturados. **Implementación:** `cart.store.test.ts`.

### Tests de reglas
`cart.test.ts`:
- `unit` recorta a 1; `quantity` recorta al stock; `availability` recorta a 50;
- `cart-full` al intentar la línea 31;
- totales mixtos ARS + USD separados (sin total combinado).

`whatsapp.test.ts`:
- `[ref XXXXXX]` en productos `unit`;
- `— Nota:` cuando hay `priceNote`;
- `Total en pesos` / `Total en USD` con dos monedas.

`ProductPage.test.tsx`:
- sin elegir sabor el botón está deshabilitado;
- elegir sabor y cantidad 2 → el contador del carrito muestra 2.

---

## Verificación Final

Automáticas:
1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` sin errores.

Manuales:
2. Local con `seed:dev`, en `/banned`:
   - agregar 2 × THE BLACK SHEEP (Grape) y 1 × THE BLACK SHEEP (Watermelon);
   - en el carrito se ve `Total: $78.000`;
   - "Enviar pedido por WhatsApp" abre `wa.me` con el mensaje.
3. Pausar THE BLACK SHEEP en la base local:
   ```bash
   npx wrangler d1 execute catalogo-db --local --command "UPDATE products SET status='paused' WHERE name='THE BLACK SHEEP'"
   ```
   Al recargar el carrito, la línea aparece como no disponible.

---

## Qué Hacer al Terminar

1. Reportar archivos creados y modificados, verificaciones y desvíos.
2. No commitear ni pushear sin instrucción explícita.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial del plan.
