# Catálogo Web Multi-Emprendimiento — Plataforma Base + Caso de Uso Vapers — Especificación SDD

## 0. Metadatos del Contrato

- **ID Ticket:** N/A
- **Versión del contrato:** v1.0
- **Fecha:** 2026-09-14
- **Modo de elicitación:** D-NEW — Requerimiento nuevo elicitado con código de apoyo
- **Nivel de confianza recomendado para el destinatario:** Medio-Alto (requerimiento nuevo, definido por el analista y validado contra un catálogo real del negocio)
- **Fase actual:** ELICITACIÓN
- **Producida por:** Ingeniero de Requisitos SDD con acceso a código (skill ing-requisitos-sdd)
- **Próximo destinatario:** Agente Arquitecto SDD
- **Alcance:** Requerimiento nuevo — Plataforma base de catálogo web reutilizable entre emprendimientos, especificada a través de su primer caso de uso: catálogo de vapes de la marca "BANNED"
- **Entry point (si flujo):** N/A — proyecto greenfield, sin código previo
- **Base de código asumida:** Proyecto greenfield. Verificado que el directorio de trabajo no es un repositorio git y no contiene código fuente (2026-09-14). No hay branch, commit ni trabajo en vuelo que declarar.
- **Fuentes consultadas:**
  - Conversación con el analista/emprendedor (Fase 1 y Fase 3, turno único), 2026-09-14.
  - Catálogo real del negocio: `BANNED - Catalogo de Modelos y Sabores (2).pdf` (Google Drive, 13 páginas), visto en sesión de navegador el 2026-09-14. Portada + 12 páginas de modelo (una por modelo).
- **Tests ejecutados:** N/A — modo requerimiento nuevo
- **NotebookLM consultado:** No — sesión solo con el analista y el catálogo aportado
- **Ticket leído:** No — no hay ticket asociado
- **Contexto de negocio declarado (Fase 1):**
  - **Motivación:** reemplazar la difusión informal (imagen/PDF por WhatsApp o redes) por un catálogo con link propio, navegable, que reduzca la fricción de mostrar modelos y sabores y de tomar el pedido.
  - **Actores:** (1) Emprendedor/administrador — carga y mantiene el catálogo; (2) Cliente final — navega desde el celular (mayormente vía Instagram/WhatsApp) y arma su pedido.
  - **NFRs declaradas:** debe poder alojarse gratis (Vercel/Cloudflare/similar), sin dominio propio (alcanza con el link que da la plataforma gratuita), liviano de hostear; si hace falta backend/base de datos pago, debe ser barato.
- **Limitaciones de acceso:** ninguna — no hay sistemas previos que acceder.
- **Asunciones explícitas** (confirmadas por el analista en Fase 3):
  - El administrador carga y edita productos mediante un panel propio con usuario y contraseña, optimizado para uso desde el celular (opción 1A).
  - El cliente arma un carrito local en su propio navegador; al confirmar, el sistema genera un mensaje prellenado con el detalle del pedido y el total, y lo redirige a WhatsApp (opción 2A). No hay checkout de pago ni reserva automática en el sistema.
  - Se construye como plataforma reutilizable: un mismo motor de catálogo sirve a distintos emprendimientos, cada uno con su propio link, marca (nombre/logo/colores) y número de WhatsApp (opción 3A). Este documento especifica el motor base a través del primer caso de uso (vapers); el catálogo de Apple/reventa de celulares se especifica en un documento aparte (`CATALOGO_APPLE_ELICITADOR_NUEVO_v1.0.md`) que reutiliza este motor y le agrega variantes específicas.
  - Cada modelo de vape puede tener varios sabores. El sabor es un atributo seleccionable del producto (no un producto aparte), consistente con cómo el propio catálogo de la marca los presenta ("sabores disponibles" listados bajo cada modelo, con un precio único por modelo — ver Sección 8, INFER-01 sobre stock por sabor).
  - El sitio muestra una pantalla de verificación de edad (+18) antes de dejar entrar al catálogo.
  - **Señal de épico evaluada:** el conjunto completo (motor multi-emprendimiento + panel admin + carrito + 2 verticales de negocio) supera los umbrales de un contrato único (más de 3 outcomes independientes, toca bases de datos + admin + tienda pública). Se decidió partir el trabajo en rebanadas verticales por emprendimiento/vertical de negocio (este documento cubre plataforma base + vapers; Apple va en documento separado) en lugar de un contrato único. Queda a criterio del Arquitecto SDD si, dentro de este documento, el Task Breakdown debe subdividirse aún más en tickets de ≤6h.
- **Decisiones diferidas al Arquitecto:**
  - Stack técnico concreto (framework frontend, lenguaje) y su compatibilidad con hosting gratuito.
  - Motor de base de datos/backend gratuito o de bajo costo para persistir productos, emprendimientos y credenciales de administrador (evaluando límites de los planes free: filas, storage de imágenes, ancho de banda).
  - Dónde y cómo se almacenan las fotos de producto (el free tier de BD suele no incluir storage de archivos grande).
  - Mecanismo de autenticación del panel admin (usuario/contraseña simple vs. proveedor externo) compatible con el presupuesto $0.
  - Estrategia de multi-tenant: subcarpetas/subrutas de un mismo despliegue (`/banned`, `/miphone`) vs. despliegues separados por emprendimiento.
  - Diseño visual del aviso de +18 y si debe ser bloqueante o solo informativo, según la normativa que el Arquitecto verifique para el país de operación.
  - Formato exacto del mensaje de WhatsApp generado (plantilla de texto) y validación del link `wa.me` con el número real del emprendedor.

---

## 1. Contexto de Negocio y Viaje de Usuario (User Journey)

- **Historia de Usuario reconstruida (administrador):** "Como emprendedor de vapes, quiero cargar y actualizar mis modelos con su foto, precio, potes/puffs y sabores disponibles desde el celular, para no depender de reenviar un PDF o publicar manualmente en redes cada vez que cambia el stock." `[USR]`
- **Historia de Usuario reconstruida (cliente):** "Como cliente que llega desde Instagram o WhatsApp, quiero ver los modelos disponibles con su precio y sabores, armar mi pedido y mandarlo por WhatsApp, para encargar sin tener que escribir todo el detalle a mano." `[USR]`
- **Descripción del flujo — Cliente:**
  1. El cliente abre el link público del catálogo (sin login).
  2. Ve un aviso de verificación de edad (+18) antes de acceder al contenido. `[USR]`
  3. Ve la grilla de modelos disponibles, cada uno con foto, nombre, puffs/capacidad, precio y sabores.
  4. Entra al detalle de un modelo para ver todos los sabores disponibles y elegir uno (o varios, si agrega más de una unidad).
  5. Agrega uno o más productos (con su sabor elegido) a un carrito que vive en su propio navegador.
  6. Revisa el carrito (cantidad, sabor, subtotal, total).
  7. Confirma el pedido: el sistema arma un mensaje de texto con el detalle (modelo, sabor, cantidad, total) y abre WhatsApp con ese mensaje prellenado, dirigido al número del emprendedor.
  8. El cierre del pedido (pago, entrega) ocurre fuera del sistema, por WhatsApp directo con el emprendedor.
- **Descripción del flujo — Administrador:**
  1. El emprendedor entra al panel admin con usuario y contraseña, desde el celular o la computadora.
  2. Ve la lista de sus modelos cargados.
  3. Da de alta un modelo nuevo: nombre, foto, precio, puffs/capacidad, lista de sabores, y si está disponible o no.
  4. Edita un modelo existente (por ejemplo, para marcarlo sin stock, cambiar el precio, o agregar/quitar sabores).
  5. Los cambios se reflejan de inmediato en el catálogo público.

---

## 2. Resultados Esperados (Outcomes)

- **Outcome 1:** Un visitante sin cuenta puede acceder al link público del catálogo, pasar la verificación de +18 y ver todos los modelos marcados como disponibles, con foto, nombre, precio y sabores. `[USR]`
- **Outcome 2:** El administrador autenticado puede crear, editar y marcar como no disponible un modelo (nombre, foto, precio, puffs/capacidad, lista de sabores), y el cambio se refleja en el catálogo público sin intervención técnica. `[USR]`
- **Outcome 3:** El cliente puede armar un carrito con uno o más productos (cada uno con su sabor elegido y cantidad), ver el total, y al confirmar recibe un link a WhatsApp con un mensaje prellenado que detalla el pedido completo y el total. `[USR]`
- **Outcome 4:** El mismo motor de catálogo puede alojar más de un emprendimiento (ej. vapers y, por separado, Apple), cada uno con su propio catálogo, marca visual y número de WhatsApp de destino, sin mezclar datos entre sí. `[USR]`
- **Outcome 5:** El sitio completo se despliega y queda accesible mediante un único link público, en un servicio de hosting gratuito, sin necesidad de comprar un dominio. `[USR]`

---

## 3. Límites de Alcance (Scope Boundaries)

- **En Alcance (In-Scope):**
  - Catálogo público de productos con foto, nombre, precio, atributo "sabor" (con lista de opciones) y estado de disponibilidad.
  - Panel de administración autenticado para alta/baja/edición de productos.
  - Carrito de compra en el navegador del cliente (sin persistencia en servidor) y generación de un pedido vía redirección a WhatsApp.
  - Aviso de verificación de edad (+18) antes de mostrar el catálogo.
  - Soporte para más de un emprendimiento/tenant sobre el mismo motor (branding y WhatsApp propios por tenant).
  - Despliegue en un hosting gratuito con link público único.
- **Fuera de Alcance (Out-of-Scope):**
  - Cobro o pago online dentro del sistema: el analista definió explícitamente que el pedido se cierra por WhatsApp (opción 2A), no hay checkout de pago. `[USR]`
  - Reserva automática de stock al momento de agregar al carrito: se descartó la opción de reserva automática (opción C del punto 2) por la complejidad de controlar reservas falsas sin servidor de por medio. `[USR]`
  - Registro de cuenta o login para el cliente final: el cliente compra sin crear usuario.
  - Envío de notificaciones (email/push) al administrador cuando entra un pedido: el aviso llega directamente por WhatsApp al confirmarse.
  - Gestión de envíos, facturación o stock post-venta (descuento automático de stock al vender): el administrador ajusta la disponibilidad manualmente.
  - Dominio propio o certificado personalizado: el analista aceptó explícitamente operar solo con el link que da la plataforma de hosting gratuita.
  - Todo lo específico del catálogo de Apple (variantes por batería/capacidad/estado, filtros avanzados, moneda dual): se especifica en `CATALOGO_APPLE_ELICITADOR_NUEVO_v1.0.md`.

---

## 4. Restricciones Técnicas y Supuestos (Constraints)

- **Presupuesto de hosting:** debe poder desplegarse en un plan gratuito (Vercel, Cloudflare Pages u opción equivalente). Si el backend/base de datos requiere un plan pago, debe mantenerse en el rango más económico disponible. `[USR]`
- **Sin dominio propio:** el link público que entrega el servicio de hosting gratuito es suficiente; no se contempla comprar un dominio. `[USR]`
- **Liviandad como prioridad de diseño:** ante una disyuntiva entre una función más rica (ej. checkout completo) y mantener el sistema liviano de hostear, el analista priorizó la liviandad. `[USR]`
- **Sin backend propio del cliente para el carrito:** el carrito no necesita persistirse en un servidor; vive en el navegador del cliente hasta que se confirma el pedido por WhatsApp. `[USR]`
- **Autenticación de administrador:** debe existir algún control de acceso (usuario/contraseña) para que solo el emprendedor pueda modificar su catálogo; el mecanismo concreto queda para el Arquitecto, sujeto al presupuesto $0. `[INFER: el analista no especificó el mecanismo exacto, solo que existe panel con usuario y contraseña]`
- **Multi-tenant desde el día uno:** el modelo de datos y el ruteo deben contemplar más de un emprendimiento aunque el primer caso de uso real sea solo BANNED. `[USR]`
- **Responsabilidad regulatoria:** la venta y publicidad de vapeadores puede estar regulada según el país/jurisdicción de operación. Esta especificación no asume ni valida esa normativa; queda como responsabilidad del emprendedor y como punto a revisar por el Arquitecto contra los términos de servicio del hosting elegido. `[INFER: riesgo señalado por el analista de requisitos, no resuelto por el analista de negocio]`

### Checklist NFR

- **Concurrencia y volumetría esperada:** catálogo chico (decenas de modelos, ver Sección 8 para el conteo real observado), tráfico bajo/medio (difusión por redes sociales de un emprendimiento). No se esperan picos que requieran infraestructura dedicada. `[INFER: no fue preguntado explícitamente; volumetría inferida del tamaño del catálogo real relevado]`
- **Performance:** sin requisito explícito más allá de "liviano". Una carga de página rápida en 3G/4G de celular es deseable dado que el acceso es mayormente mobile. `[INFER]`
- **Auditoría/trazabilidad:** no se pidió historial de cambios de precio/stock. No está en alcance salvo que el Arquitecto lo considere gratis de implementar con la base elegida.
- **Permisos:** un solo rol administrador por emprendimiento (no se pidieron sub-roles ni multi-usuario administrador).
- **Comportamiento ante fallo de WhatsApp:** si el cliente no tiene WhatsApp instalado/vinculado, el link `wa.me` degrada a la versión web de WhatsApp; no se definió un fallback adicional. `[INFER]`
- **Migración de datos:** no aplica — no hay datos previos que migrar (el catálogo actual del negocio es un PDF estático, no una fuente de datos estructurada).

---

## 5. Decisiones de Diseño Previas e Integración

No hay componentes de código preexistentes para reutilizar (proyecto greenfield). Sí hay un activo de negocio a reutilizar como referencia de contenido y estructura de datos:

- **Catálogo real de la marca BANNED:** `BANNED - Catalogo de Modelos y Sabores (2).pdf`, 13 páginas (portada + 12 modelos). Confirma la forma real de los datos: cada modelo tiene nombre propio (ej. "THE BLACK SHEEP"), una capacidad en puffs (ej. "30.000 PUFF"), **un precio único por modelo** (no por sabor) en pesos argentinos (ej. "$26.000"), una foto del dispositivo, y una lista de sabores disponibles presentados como combinaciones con emojis (ej. "GRAPE / STRAWBERRY KIWI 🍇🍓🥝"). `[USR: catálogo compartido por el analista, visto en sesión de navegador 2026-09-14]`
- **Este mismo documento (motor base):** el documento `CATALOGO_APPLE_ELICITADOR_NUEVO_v1.0.md` reutiliza el modelo de tenant/emprendimiento, el panel admin, la autenticación y el mecanismo de carrito/WhatsApp definidos acá, agregando su propio tipo de producto y filtros.

---

## 6. Desglose de Tareas de Ingeniería (Task Breakdown)

### T01 — Modelo de datos multi-tenant

- **Descripción:** definir y crear el esquema de datos para "emprendimiento/tenant" (nombre, logo, colores, número de WhatsApp, slug de URL) y "producto" (nombre, foto, precio, disponibilidad, atributos flexibles — puffs y sabores para este caso de uso).
- **Reutiliza:** ninguno (greenfield).
- **Depende de:** Ninguna.
- **Criterio de finalización:** puede crearse un tenant "BANNED" y cargar al menos un producto con sus sabores sin tocar código.

### T02 — Panel de administración autenticado

- **Descripción:** pantalla de login y CRUD de productos del tenant autenticado, usable desde celular.
- **Reutiliza:** modelo de datos de T01.
- **Depende de:** T01.
- **Criterio de finalización:** un usuario administrador puede loguearse y ver únicamente los productos de su propio tenant; no puede ver ni editar productos de otro tenant.

### T03 — Catálogo público con verificación de edad

- **Descripción:** página pública por tenant que muestra el aviso +18 y, tras aceptarlo, la grilla de productos disponibles con su detalle (sabores incluidos).
- **Reutiliza:** modelo de datos de T01.
- **Depende de:** T01.
- **Criterio de finalización:** al entrar al link del tenant sin haber aceptado el aviso, se ve el aviso antes que el catálogo; tras aceptarlo, se listan solo los productos marcados como disponibles.

### T04 — Carrito local y redirección a WhatsApp

- **Descripción:** carrito persistido en el navegador del cliente (ej. `localStorage`), con alta/baja/cambio de cantidad y sabor por línea, cálculo de total, y botón de confirmación que arma un mensaje de texto y abre `wa.me/<número del tenant>` con ese mensaje prellenado.
- **Reutiliza:** número de WhatsApp del tenant (T01).
- **Depende de:** T01, T03.
- **Criterio de finalización:** con al menos 2 productos distintos en el carrito, al confirmar se abre WhatsApp con un mensaje que incluye cada producto, su sabor, cantidad y el total correcto.

### T05 — Despliegue en hosting gratuito

- **Descripción:** configurar el proyecto para desplegarse en el servicio gratuito que elija el Arquitecto (Vercel/Cloudflare Pages u otro), obteniendo un link público estable.
- **Reutiliza:** N/A.
- **Depende de:** T01, T02, T03, T04.
- **Criterio de finalización:** el link público muestra el catálogo del tenant BANNED y el panel admin es accesible en una ruta separada, ambos funcionando en producción sin costo.

---

## 7. Criterios de Aceptación y Pruebas (Verification Criteria)

### AC01 — Ver catálogo público tras aceptar +18

- **Dado:** un visitante nuevo (sin cookie/flag de edad confirmada) entra al link del tenant "BANNED".
- **Cuando:** se le muestra el aviso de verificación de edad y hace clic en "Soy mayor de 18".
- **Entonces:** se le muestra la grilla de modelos disponibles (ej. "THE BLACK SHEEP", $26.000, 30.000 puffs) con foto, precio y acceso a sus sabores.
- **Origen:** `[USR]`

### AC02 — Producto sin stock no se muestra en el catálogo público

- **Dado:** el administrador del tenant "BANNED" marca el modelo "THE BLACK SHEEP" como no disponible.
- **Cuando:** un cliente entra al catálogo público de "BANNED".
- **Entonces:** el modelo "THE BLACK SHEEP" no aparece en la grilla de productos disponibles.
- **Origen:** `[USR]`

### AC03 — Alta de producto desde el panel admin

- **Dado:** el administrador del tenant "BANNED" está autenticado en el panel.
- **Cuando:** carga un nuevo modelo "ICE STORM" con precio $28.000, 25.000 puffs, foto y sabores "Mint / Menthol" y "Mango / Piña".
- **Entonces:** el modelo "ICE STORM" aparece inmediatamente en el catálogo público del tenant "BANNED" con esos datos, y no aparece en el catálogo de ningún otro tenant.
- **Origen:** `[USR]`

### AC04 — Armado de pedido y redirección a WhatsApp

- **Dado:** un cliente agregó al carrito 2 unidades de "THE BLACK SHEEP" sabor "Grape / Strawberry Kiwi" ($26.000 c/u) y 1 unidad de "ICE STORM" sabor "Mint / Menthol" ($28.000).
- **Cuando:** el cliente confirma el pedido desde el carrito.
- **Entonces:** se abre un link a WhatsApp dirigido al número configurado para el tenant "BANNED", con un mensaje prellenado que detalla ambas líneas (modelo, sabor, cantidad) y el total: $80.000.
- **Origen:** `[USR]`

### AC05 — Aislamiento entre tenants

- **Dado:** existen dos tenants activos, "BANNED" y otro emprendimiento de prueba, cada uno con su propio administrador y catálogo.
- **Cuando:** el administrador de "BANNED" inicia sesión.
- **Entonces:** solo ve y puede editar los productos de "BANNED"; no tiene forma de listar, ver ni modificar productos del otro tenant.
- **Origen:** `[USR]`

### AC06 — Catálogo accesible por link público sin login

- **Dado:** el sitio está desplegado en el hosting gratuito elegido.
- **Cuando:** cualquier persona abre el link público del tenant "BANNED" (sin credenciales).
- **Entonces:** puede navegar el catálogo completo (tras el aviso +18) sin necesidad de crear cuenta ni iniciar sesión.
- **Origen:** `[USR]`

### Notas sobre la reconstrucción de criterios

Todos los criterios son a-priori (`[USR]`), derivados de las respuestas del analista en Fase 1/Fase 3 y validados contra la estructura real del catálogo PDF de la marca. No hay tests ni código previo que aporten cobertura adicional.

---

## 8. Gaps, Inferencias Opacas y Conflictos

### 8.1 Inferencias Opacas

| ID | Afirmación | Sección donde aparece | Razón de la inferencia opaca |
|---|---|---|---|
| INFER-01 | El sabor es un atributo seleccionable del producto, sin stock ni precio propio por sabor (el precio es único por modelo) | Secciones 0, 1, 5 | El catálogo PDF de la marca presenta "sabores disponibles" como una lista bajo un único precio por modelo, sin indicar stock diferenciado por sabor. El analista respondió "con sabores" a la pregunta de variantes sin aclarar si cada sabor tiene su propio stock. Si en la práctica el emprendedor sí controla stock por sabor, esto cambia el modelo de datos de T01. |
| INFER-02 | Mecanismo exacto de autenticación del panel admin (usuario/contraseña simple gestionado por la propia app vs. proveedor externo) | Sección 4 | El analista confirmó que existe panel con usuario y contraseña (opción 1A) pero no definió la implementación; se deja explícitamente para el Arquitecto por ser una decisión técnica ligada al presupuesto $0. |
| INFER-03 | Umbral de volumetría/tráfico esperado | Sección 4 (Checklist NFR) | No fue preguntado explícitamente; se infiere "bajo" del tamaño del catálogo real (12 modelos) y del canal de difusión declarado (redes sociales de un emprendimiento chico). |
| INFER-04 | Alcance regulatorio de venta/publicidad de vapeadores en la jurisdicción del emprendedor | Sección 4 | No fue relevado el país/jurisdicción de operación; se señala como riesgo a verificar, no se resuelve en este documento. |

### 8.2 Conflictos Código ↔ Documentación

No aplica — sesión sin NotebookLM y sin código previo que pueda entrar en conflicto con documentación de negocio.

### 8.3 Hallazgos de base de código

No aplica — proyecto greenfield, sin repositorio ni trabajo en vuelo.

---

## Actualizaciones Sugeridas al Mapa del Sistema (opcional)

No aplica todavía — no existe `docs/specs/ARQUITECTURA_DEL_SISTEMA.md`. Se sugiere que el Arquitecto lo genere en su primera intervención sobre este proyecto, dado que a partir de acá empieza a existir código real.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial. Requerimiento nuevo (modo D-NEW), sin código previo. Fuente de negocio: catálogo real de la marca BANNED (PDF, 12 modelos) + respuestas del analista en Fase 1/Fase 3. Tests ejecutados: N/A. NotebookLM: No. Ticket leído: No. Conteo real de marcas: `[USR]`: 24, `[INFER]`: 4, `[CODE]`: 0, `[TEST]`: 0, `[TEST-EXEC]`: 0, `[DOC]`: 0, `[CODE+DOC]`: 0, `[TICKET]`: 0, `[CONFLICT]`: 0.
