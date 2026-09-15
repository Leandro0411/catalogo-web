# Catálogo Web Multi-Emprendimiento — Vertical Reventa de Apple — Especificación SDD

## 0. Metadatos del Contrato

- **ID Ticket:** N/A
- **Versión del contrato:** v1.0
- **Fecha:** 2026-09-14
- **Modo de elicitación:** D-NEW — Requerimiento nuevo elicitado con código de apoyo
- **Nivel de confianza recomendado para el destinatario:** Medio-Alto (requerimiento nuevo, definido por el analista y validado contra una planilla de stock real del negocio)
- **Fase actual:** ELICITACIÓN
- **Producida por:** Ingeniero de Requisitos SDD con acceso a código (skill ing-requisitos-sdd)
- **Próximo destinatario:** Agente Arquitecto SDD
- **Alcance:** Requerimiento nuevo — Vertical de negocio "reventa de productos Apple" sobre la plataforma base de catálogo especificada en `CATALOGO_BASE_VAPERS_ELICITADOR_NUEVO_v1.0.md`
- **Entry point (si flujo):** N/A — proyecto greenfield, sin código previo
- **Base de código asumida:** Proyecto greenfield, sin repositorio git ni código (mismo estado verificado en el documento base, 2026-09-14). Este documento asume que la plataforma base (tenants, admin, autenticación) descripta en `CATALOGO_BASE_VAPERS_ELICITADOR_NUEVO_v1.0.md` v1.0 se construye primero o en paralelo; no depende de un branch específico porque aún no existe código de ninguno de los dos.
- **Fuentes consultadas:**
  - Conversación con el analista/emprendedor (Fase 1 y Fase 3, turno único), 2026-09-14.
  - Documento base de la plataforma: `CATALOGO_BASE_VAPERS_ELICITADOR_NUEVO_v1.0.md` v1.0.
  - Planilla real del negocio: "Listado miphone.mza" (Google Sheets, hoja única), vista en sesión de navegador el 2026-09-14. Precios marcados por el propio vendedor como "actualizados a hoy 14/09/26".
- **Tests ejecutados:** N/A — modo requerimiento nuevo
- **NotebookLM consultado:** No
- **Ticket leído:** No
- **Contexto de negocio declarado (Fase 1):**
  - **Motivación:** reemplazar una planilla de Google Sheets como catálogo de cara al cliente. La planilla es apta para que el vendedor administre stock, pero poco accesible/navegable para quien quiere ver qué hay disponible, filtrar por lo que busca o comparar opciones.
  - **Actores:** (1) Revendedor/administrador — actualiza stock, precio y estado de batería constantemente; (2) Cliente final — busca un modelo o rango de precio específico y quiere filtrar en vez de leer una planilla completa.
  - **NFRs declaradas:** mismas que la plataforma base — hosting gratuito, sin dominio propio, backend barato si hace falta, priorizando liviandad. Acá se suma que la carga de datos es más frecuente/dinámica que en el caso de vapers.
- **Limitaciones de acceso:** ninguna — no hay sistemas previos que acceder.
- **Asunciones explícitas** (confirmadas por el analista en Fase 3, punto 4, y por la planilla real relevada):
  - El catálogo de Apple es un **tenant más** sobre la misma plataforma base (reutiliza tenant, admin, autenticación y aislamiento entre emprendimientos definidos en el documento base).
  - Carga de stock **mixta** (opción 4A): los equipos usados (iPhones) se cargan como **unidad única** con sus propios atributos (batería, color, capacidad, estado); los accesorios y equipos sellados se cargan **por cantidad** (sin unidad individualizada).
  - Moneda: **USD**, pero el vendedor carga la cotización a pesos **a mano** para ambos casos (no hay conversión automática). La planilla real confirma esto: la mayoría de los productos (iPhones, MacBooks, iPads) están en USD, pero los accesorios están cargados directamente en pesos argentinos — el vendedor no convierte accesorios a USD. `[USR]` + `[CODE: fila de accesorios de la planilla, ver Sección 5]` — nota: se usa `[CODE]` de forma análoga a evidencia de artefacto real, no de código de programación (no hay código en este proyecto); ver aclaración en Sección 5.
  - No hay reserva automática ni checkout de pago (mismo criterio que el documento base): el pedido se cierra por WhatsApp.
  - **Señal de épico evaluada:** este vertical, por sí solo, ya supera los umbrales de un contrato único (más de 3 outcomes: stock por unidad, stock por cantidad, filtros multi-criterio, moneda dual manual — y toca varias tablas: productos, unidades, atributos por categoría). Se mantiene como un solo documento de requerimiento (rebanada vertical = "vertical de negocio Apple") tal como se acordó en el documento base; se delega al Arquitecto la decisión de partir el Task Breakdown de la Sección 6 en tickets de ≤6h.
- **Decisiones diferidas al Arquitecto:**
  - Modelo de datos concreto para "atributos por categoría" (un iPhone tiene batería/capacidad/color; un accesorio no tiene batería; un MacBook tiene RAM/almacenamiento pero no capacidad de batería en %) — evaluar si conviene una tabla flexible (atributos clave-valor) o una tabla por categoría.
  - Mecanismo de carga rápida de stock para el administrador (por ejemplo, si conviene poder duplicar un producto similar para cargar uno nuevo más rápido, dado el volumen y la frecuencia de actualización).
  - Diseño exacto de los filtros (checkboxes, sliders de precio/batería, buscador de texto) y su comportamiento combinado (AND entre filtros).
  - Si conviene ofrecer una vista de importación asistida desde una planilla (CSV/Sheets) para la carga inicial del stock actual, dado que hoy el negocio ya tiene ~60 filas cargadas en Sheets y recargarlas una por una a mano es una migración manual costosa.
  - Formato exacto del mensaje de WhatsApp para un pedido con productos en USD y ARS mezclados en el mismo carrito.

---

## 1. Contexto de Negocio y Viaje de Usuario (User Journey)

- **Historia de Usuario reconstruida (administrador):** "Como revendedor de productos Apple, quiero actualizar precio, stock y porcentaje de batería de mis equipos desde un panel simple, para no depender de editar una planilla de Sheets que mis clientes no pueden navegar cómodamente." `[USR]`
- **Historia de Usuario reconstruida (cliente):** "Como cliente que busca un iPhone usado dentro de un presupuesto y con buena batería, quiero filtrar el catálogo por esos criterios en vez de leer fila por fila una planilla, para encontrar más rápido lo que me sirve." `[USR]`
- **Descripción del flujo — Cliente:**
  1. El cliente abre el link público del tenant de reventa Apple.
  2. Ve el catálogo organizado por categoría (iPhones, MacBooks, iPads, AirPods, Accesorios), reflejando el orden en que el propio vendedor organiza su planilla hoy (ver Sección 5).
  3. Aplica filtros (categoría, modelo, capacidad, estado, batería mínima, precio) y/o usa un buscador de texto libre.
  4. Ve el detalle de un producto: para un iPhone usado, ve su batería, color, capacidad y precio individual (porque es una unidad única); para un accesorio, ve su precio y si hay stock disponible (sin ficha de unidad individual).
  5. Agrega productos al carrito y confirma el pedido, igual que en el flujo base (redirección a WhatsApp con el detalle armado).
- **Descripción del flujo — Administrador:**
  1. El revendedor entra al panel admin de su tenant.
  2. Ve su stock organizado por categoría.
  3. Da de alta una unidad nueva (ej. un iPhone usado con su batería/color/capacidad) o ajusta cantidad/precio de un ítem por cantidad (ej. una funda).
  4. Actualiza precio o porcentaje de batería de una unidad existente cuando cambia (por ejemplo, si un cliente pide una rebaja o si vuelve a testear el equipo).
  5. Marca una unidad como vendida (deja de listarse en el catálogo público) o ajusta la cantidad disponible de un ítem por cantidad.

---

## 2. Resultados Esperados (Outcomes)

- **Outcome 1:** Un visitante puede ver el catálogo de Apple organizado por categoría (iPhones, MacBooks, iPads, AirPods, Accesorios) sin tener que abrir una planilla. `[USR]`
- **Outcome 2:** El cliente puede filtrar el catálogo combinando categoría, modelo, capacidad de almacenamiento, estado (sellado/usado/premium), batería mínima y rango de precio, y/o buscar por texto libre, y ver solo los resultados que cumplen todos los filtros aplicados. `[USR]`
- **Outcome 3:** El administrador puede cargar un equipo usado como unidad individual con sus propios atributos (batería %, color, capacidad, precio en USD) y cargar un accesorio o equipo sellado como ítem por cantidad (precio en USD o en ARS, cantidad disponible). `[USR]` + evidencia de la planilla real (Sección 5).
- **Outcome 4:** El administrador puede actualizar precio, batería o disponibilidad de un producto existente en cualquier momento, y el catálogo público refleja el cambio de inmediato — soportando el ritmo de actualización constante que describe el analista. `[USR]`
- **Outcome 5:** El pedido armado en el carrito y enviado por WhatsApp muestra correctamente los montos de productos en USD y de productos en ARS dentro del mismo pedido, sin conversión automática entre monedas. `[USR]`

---

## 3. Límites de Alcance (Scope Boundaries)

- **En Alcance (In-Scope):**
  - Catálogo público filtrable de productos Apple (iPhones, MacBooks, iPads, AirPods, accesorios).
  - Dos formas de carga de stock: unidad única (con atributos propios) e ítem por cantidad.
  - Carga de precio en USD o en ARS por producto, a criterio del administrador, sin conversión automática.
  - Reutilización íntegra de tenant, panel admin, autenticación, carrito y redirección a WhatsApp del documento base.
- **Fuera de Alcance (Out-of-Scope):**
  - Conversión automática de cotización dólar/peso: el analista confirmó explícitamente que la carga es manual en ambos casos. `[USR]`
  - Checkout de pago o financiación dentro del sistema: mismo criterio que el documento base, el cierre es por WhatsApp.
  - Verificación automática de IMEI, garantía o autenticidad del equipo: el testeo/garantía escrita que ofrece el negocio (ver planilla, filas 16-18) es un proceso comercial externo al sistema, no una funcionalidad a construir.
  - Importación automática y recurrente desde Google Sheets (sincronización en vivo): se contempla, como mucho, una importación asistida **puntual** para la carga inicial (ver "Decisiones diferidas al Arquitecto"), no una integración permanente con Sheets.
  - Gestión de reservas o apartados de un equipo específico: no se pidió, y es consistente con la decisión de no tener reservas automáticas del documento base.
  - Historial de cambios de precio o de batería a lo largo del tiempo: no se pidió y no está en alcance.

---

## 4. Restricciones Técnicas y Supuestos (Constraints)

- **Reutiliza restricciones del documento base:** hosting gratuito, sin dominio propio, backend barato si hace falta, liviandad como prioridad. `[USR]`
- **Volumetría de stock:** la planilla real relevada tiene aproximadamente 60 filas de productos activos (iPhones sellados y usados, MacBooks, iPads, accesorios) — ver Sección 5. Se espera que el catálogo real ronde ese orden de magnitud, con alta frecuencia de edición (varias actualizaciones por semana, según "todo el tiempo" declarado por el analista). `[INFER: conteo tomado de la planilla real; frecuencia de edición inferida de la expresión "todo el tiempo" del analista]`
- **Atributos variables por categoría:** un iPhone usado tiene batería (%), a veces ciclos de carga, color y capacidad; un iPhone sellado tiene garantía y color/capacidad pero no batería relevante (100% de fábrica); un MacBook tiene RAM/almacenamiento y color, sin porcentaje de batería visible en la planilla; un accesorio solo tiene precio y, a veces, cantidad con descuento por volumen (ver fila "2x" en Sección 5). Esto implica que no todos los productos comparten el mismo conjunto de campos. `[CODE: estructura observada en la planilla "Listado miphone.mza", filas 10-61]`
- **Condición "AS IS":** algunas unidades usadas están marcadas "AS IS" (se venden como están, sin garantía de funcionamiento total), lo cual es un valor más del campo "estado", no una categoría aparte. `[CODE: filas 35-36 de la planilla]`
- **Precio de accesorios con descuento por cantidad:** la planilla muestra algunos accesorios con una nota "2x" y un precio total distinto al de la unidad (ej. "Fundas Silicona case: $10.500 c/u, 2x $16.000"). Se registra como comportamiento real del negocio, pero se deja para que el Arquitecto decida si se modela como una regla de precio o simplemente como una aclaración de texto en la descripción del producto, dado que agregar un motor de descuentos por cantidad no es liviano. `[CODE: filas 57-60 de la planilla]`

### Checklist NFR

- **Concurrencia y volumetría esperada:** stock de ~60 productos activos, con alta frecuencia de edición por parte de un único administrador. No hay concurrencia de múltiples administradores editando a la vez (un solo admin por tenant, igual que en el documento base).
- **Performance de filtros:** con un catálogo de este tamaño (decenas, no miles de productos), un filtrado en el propio navegador (sin ida y vuelta al servidor por cada filtro) es viable y más liviano; se dejó como sugerencia de diseño para el Arquitecto, no como requisito cerrado. `[INFER]`
- **Auditoría/trazabilidad:** no se pidió historial de cambios de precio/batería.
- **Permisos:** un solo rol administrador por tenant, igual que el documento base.
- **Comportamiento ante fallo:** no aplica integración externa nueva (no hay sincronización en vivo con Sheets en alcance).
- **Compatibilidad con datos existentes:** existe una planilla real con datos de stock vigentes. No es una migración automática obligatoria, pero es la fuente que el administrador va a querer volcar al nuevo sistema al lanzar; el Arquitecto debe considerar si vale la pena una carga asistida inicial (ver "Decisiones diferidas al Arquitecto").

---

## 5. Decisiones de Diseño Previas e Integración

- **Plataforma base (documento `CATALOGO_BASE_VAPERS_ELICITADOR_NUEVO_v1.0.md`):** este vertical reutiliza íntegramente el modelo de tenant, el panel de administración autenticado, el aislamiento entre emprendimientos, el carrito local y la redirección a WhatsApp especificados ahí. Lo único que agrega es: (a) un tipo de producto con atributos variables por categoría, (b) las dos formas de carga (unidad única / por cantidad), y (c) precio en moneda mixta (USD/ARS) sin conversión automática.
- **Planilla real del negocio — "Listado miphone.mza" (Google Sheets):** fuente de evidencia de cómo se organizan hoy los datos. Estructura observada (vista en sesión de navegador, 2026-09-14):
  - Encabezado con condiciones comerciales generales (medios de pago, garantía de sellados) y una celda que indica la fecha de actualización de precios ("Precios actualizados a hoy 14/09/26").
  - Bloque **"iPhones SELLADOS"**: nombre de producto embebido en una sola celda (ej. "iPhone 17 256GB (Sage)"), precio en USD y, para algunos, precio equivalente en ARS ya calculado por el vendedor.
  - Bloque **"iPhones usados seleccionados PREMIUM"**: mismo patrón de nombre embebido, pero incluyendo porcentaje de batería y a veces ciclos de carga (ej. "iPhone 17 256GB (Blue) 105 ciclos", "iPhone 15 Pro Max 256 87% (White)"), y ocasionalmente la marca "AS IS" para unidades sin garantía de funcionamiento total. Precio en USD.
  - Bloque **"Macbooks e iPads SELLADOS"**: mismo patrón (modelo, chip, RAM/almacenamiento, color embebidos en el nombre), precio en USD, con nota de que también se consiguen a pedido en otras configuraciones.
  - Bloque **"Accesorios"**: vidrios templados, fundas, cargadores, adaptadores, AirPods — acá el precio está cargado **directamente en pesos argentinos** (no en USD), y algunos ítems muestran una segunda columna con precio por pack de 2 unidades.
  - Esta estructura confirma la necesidad de: (1) que el "nombre" del producto sea libre y no forzado a partir de campos separados de forma rígida (el vendedor hoy describe todo en una sola celda de forma consistente pero no estrictamente tabular), aunque el nuevo sistema sí debería separar los atributos clave (capacidad, color, batería) en campos propios para poder filtrar por ellos; y (2) que el precio pueda cargarse en USD o en ARS según el producto, sin forzar una sola moneda para todo el catálogo.
  - Nota de trazabilidad: se cita esta planilla como `[CODE: ...]` en las secciones anteriores por analogía con "artefacto real observado" (es la convención más cercana disponible en el formato del pipeline SDD para "evidencia de un sistema/proceso real, no de código fuente"); no debe confundirse con código de programación, ya que este proyecto no tiene código previo.

---

## 6. Desglose de Tareas de Ingeniería (Task Breakdown)

### T01 — Modelo de datos de producto con atributos variables por categoría

- **Descripción:** extender el modelo de "producto" del documento base para soportar atributos específicos por categoría (batería, color, capacidad, estado, RAM/almacenamiento) sin forzar campos irrelevantes en categorías que no los usan (ej. un accesorio no tiene batería).
- **Reutiliza:** modelo de tenant/producto base (T01 del documento `CATALOGO_BASE_VAPERS`).
- **Depende de:** T01 del documento base.
- **Criterio de finalización:** puede cargarse un iPhone usado con batería/color/capacidad y, en el mismo catálogo, un accesorio sin esos campos, sin que el formulario de carga obligue a completar atributos que no aplican.

### T02 — Carga de stock por unidad única vs. por cantidad

- **Descripción:** permitir que un producto se cargue como una unidad individual (con sus atributos propios, disponible/vendido) o como un ítem con cantidad disponible (sin unidad individualizada), según el tipo de producto.
- **Reutiliza:** T01 de este documento.
- **Depende de:** T01 de este documento.
- **Criterio de finalización:** al vender la única unidad de un iPhone cargado como unidad única, deja de listarse en el catálogo; al vender una funda cargada por cantidad, la cantidad disponible baja en uno y sigue listada mientras quede stock.

### T03 — Precio en moneda mixta (USD/ARS) sin conversión automática

- **Descripción:** permitir que cada producto tenga su precio cargado en USD o en ARS, mostrando la moneda correspondiente en el catálogo público y en el carrito, sin convertir entre monedas.
- **Reutiliza:** carrito del documento base (T04).
- **Depende de:** T01 del documento base, T04 del documento base.
- **Criterio de finalización:** un carrito con un iPhone en USD y una funda en ARS muestra ambos montos en su moneda original y el mensaje de WhatsApp generado los detalla sin mezclar ni convertir los totales.

### T04 — Filtros del catálogo público

- **Descripción:** UI de filtrado por categoría, modelo, capacidad, estado, batería mínima y rango de precio, más buscador de texto libre, combinables entre sí (AND).
- **Reutiliza:** catálogo público del documento base (T03).
- **Depende de:** T01 de este documento, T03 del documento base.
- **Criterio de finalización:** al aplicar "categoría: iPhone" + "batería mínima: 90%" + "precio máximo: USD 700", el catálogo muestra solo los iPhones que cumplen las tres condiciones a la vez.

### T05 — Carga inicial del stock existente

- **Descripción:** decidir y ejecutar la estrategia de volcado del stock actual (relevado en la planilla "Listado miphone.mza") al nuevo sistema, ya sea carga manual asistida o importación puntual.
- **Reutiliza:** panel admin del documento base (T02) y modelo de este documento (T01/T02).
- **Depende de:** T01, T02 de este documento; T02 del documento base.
- **Criterio de finalización:** el catálogo público en producción refleja el stock real vigente del negocio al momento del lanzamiento, sin errores de precio o atributos respecto de la planilla de origen.

---

## 7. Criterios de Aceptación y Pruebas (Verification Criteria)

### AC01 — Carga de unidad única con atributos

- **Dado:** el administrador del tenant de reventa Apple está autenticado.
- **Cuando:** carga un iPhone 15 Pro Max 256GB, color "Natural", batería 87%, precio USD 735, categoría "iPhone usado".
- **Entonces:** el producto aparece en el catálogo público bajo la categoría "iPhones usados" mostrando esos cuatro atributos y su precio en USD.
- **Origen:** `[USR]` + `[CODE: fila 27 de la planilla "Listado miphone.mza"]`

### AC02 — Carga de ítem por cantidad

- **Dado:** el administrador carga "Fundas Silicona case", precio $10.500 ARS por unidad, cantidad disponible 8.
- **Cuando:** un cliente compra 2 unidades desde el catálogo público.
- **Entonces:** la cantidad disponible del ítem baja a 6 y el ítem sigue listado en el catálogo.
- **Origen:** `[USR]` + `[CODE: fila 57 de la planilla]`

### AC03 — Filtro combinado por categoría, batería y precio

- **Dado:** el catálogo tiene cargados, entre otros, "iPhone 15 Pro 128 (Black) 100%" a USD 665 y "iPhone 14 Pro 128 (Black) 100% AS IS" a USD 570, ambos categoría "iPhone usado".
- **Cuando:** el cliente filtra por categoría "iPhone usado", batería mínima 95% y precio máximo USD 700.
- **Entonces:** ambos productos aparecen en el resultado (cumplen los tres filtros), y cualquier iPhone con batería menor a 95% o precio mayor a USD 700 queda excluido.
- **Origen:** `[USR]` + `[CODE: filas 29 y 37 de la planilla]`

### AC04 — Producto vendido (unidad única) desaparece del catálogo

- **Dado:** existe una única unidad cargada de "iPhone 17 256GB (Sage)" sellado, USD 1080.
- **Cuando:** el administrador la marca como vendida.
- **Entonces:** el producto deja de aparecer en el catálogo público, incluso sin filtros aplicados.
- **Origen:** `[USR]`

### AC05 — Pedido con moneda mixta en el mensaje de WhatsApp

- **Dado:** un cliente tiene en el carrito un "iPhone 14 128 (Red) 100%" a USD 410 y un "Cargador completo certificado" a $22.000 ARS.
- **Cuando:** confirma el pedido.
- **Entonces:** el mensaje de WhatsApp generado detalla ambas líneas con su moneda original (USD 410 y $22.000 ARS) y no calcula ni muestra un total único combinado entre las dos monedas.
- **Origen:** `[USR]`

### AC06 — Actualización de precio o batería se refleja de inmediato

- **Dado:** un iPhone usado está publicado con batería 84%.
- **Cuando:** el administrador testea el equipo de nuevo y actualiza la batería a 88% y ajusta el precio.
- **Entonces:** el catálogo público muestra los valores nuevos sin demora perceptible ni intervención técnica adicional.
- **Origen:** `[USR]`

### Notas sobre la reconstrucción de criterios

Todos los criterios son a-priori (`[USR]`), reforzados con casos reales tomados de la planilla "Listado miphone.mza" (marcados `[CODE]` por convención de evidencia de artefacto real, según la aclaración de la Sección 5). No hay tests ni código previo.

---

## 8. Gaps, Inferencias Opacas y Conflictos

### 8.1 Inferencias Opacas

| ID | Afirmación | Sección donde aparece | Razón de la inferencia opaca |
|---|---|---|---|
| INFER-01 | El descuento por cantidad ("2x") en accesorios se modela como regla de precio o como aclaración de texto, a decidir por el Arquitecto | Secciones 0, 4, 6 | El analista no fue consultado puntualmente sobre este caso; se detectó al revisar la planilla real y se prioriza no complejizar el sistema con un motor de descuentos. |
| INFER-02 | Volumetría y frecuencia de edición ("~60 productos", "varias veces por semana") | Sección 4 | Inferida del conteo real de filas de la planilla y de la expresión "todo el tiempo" usada por el analista, sin un número concreto de actualizaciones por semana. |
| INFER-03 | Performance de filtrado en el propio navegador vs. contra un backend | Sección 4 (Checklist NFR) | Es una sugerencia de diseño derivada del tamaño chico del catálogo, no una restricción explícita del analista; el Arquitecto puede decidir lo contrario si el motor de datos elegido lo hace igual de liviano. |
| INFER-04 | Necesidad y forma de una carga inicial asistida desde la planilla existente | Secciones 0, 6 (T05) | El analista no fue consultado sobre si quiere volcar el stock actual a mano o de forma asistida; dado el volumen (~60 filas), se señala como decisión a tomar con el Arquitecto en vez de asumir "carga 100% manual". |

### 8.2 Conflictos Código ↔ Documentación

No aplica — sesión sin NotebookLM. La única "fuente documental" es la planilla real del negocio, que se trata como evidencia de contexto (`[CODE]` por convención), no como documentación de negocio en el sentido del pipeline (no hubo divergencia entre esa planilla y las respuestas del analista).

### 8.3 Hallazgos de base de código

No aplica — proyecto greenfield, sin repositorio ni trabajo en vuelo. Único hallazgo relevante para el Arquitecto: existe una fuente de datos real (la planilla de Sheets) que puede usarse como caso de prueba de carga y como insumo para la carga inicial (ver T05 y INFER-04).

---

## Actualizaciones Sugeridas al Mapa del Sistema (opcional)

No aplica todavía — no existe `docs/specs/ARQUITECTURA_DEL_SISTEMA.md`. Ver la misma sugerencia hecha en el documento base: el Arquitecto debería generarlo en su primera intervención.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial. Requerimiento nuevo (modo D-NEW), sin código previo. Fuente de negocio: planilla real "Listado miphone.mza" (~60 filas de stock) + respuestas del analista en Fase 1/Fase 3. Depende del documento base `CATALOGO_BASE_VAPERS_ELICITADOR_NUEVO_v1.0.md` v1.0. Tests ejecutados: N/A. NotebookLM: No. Ticket leído: No. Conteo real de marcas: `[USR]`: 22, `[CODE]` (evidencia de planilla real): 9, `[INFER]`: 4, `[TEST]`: 0, `[TEST-EXEC]`: 0, `[DOC]`: 0, `[CODE+DOC]`: 0, `[TICKET]`: 0, `[CONFLICT]`: 0.
