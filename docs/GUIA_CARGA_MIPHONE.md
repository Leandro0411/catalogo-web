# Guía de carga — miphone.mza

Esta guía te ayuda a pasar tu planilla al panel del catálogo. No hace falta saber de programación: es cargar un formulario, como llenar los datos de un producto en cualquier tienda online.

Accedé al panel en `https://catalogo.prestige1.workers.dev/admin/login` con el usuario y la contraseña que te dieron por privado.

---

## 1. Qué categoría y qué modo de stock usar para cada bloque de tu planilla

| Bloque de tu planilla | Categoría en el panel | Modo de stock | Moneda |
|---|---|---|---|
| iPhones SELLADOS | iPhones | **Unidad única** (o "Por cantidad" si tenés varios idénticos) | USD |
| iPhones usados seleccionados PREMIUM | iPhones | **Unidad única**, Estado "Usado" o "AS IS" según corresponda | USD |
| Macbooks e iPads SELLADAS | MacBooks / iPads | **Por cantidad** | USD |
| Accesorios y AirPods | Accesorios o AirPods | **Por cantidad** (o "Disponible sí/no" para un servicio sin límite de stock, como instalar un vidrio templado) | ARS; la columna "2x" de tu planilla va en el campo **Nota de precio** (por ejemplo `2x $16.000`) |

Los equipos usados son siempre **unidad única**: cada iPhone de tu planilla es un equipo físico distinto, con su propia batería y color, así que no se agrupan por cantidad.

---

## 2. Cómo leer el nombre de un equipo de tu planilla y pasarlo al formulario

El nombre del formulario (campo "Nombre") podés dejarlo igual al de la planilla, tal cual. Lo importante es repartir esos mismos datos en los campos de abajo, porque son los que después permiten filtrar por batería, capacidad o color en el catálogo:

**Ejemplo 1 — un usado normal:**

`iPhone 15 Pro 128 100% (Natural)` de tu planilla se carga así:
- Modelo: `iPhone 15 Pro`
- Capacidad: `128GB`
- Color: `Natural`
- Estado: `Usado`
- Batería: `100`
- Precio: `665` USD (el de "Precio en USD" de tu planilla; no hace falta cargar el equivalente en pesos, el catálogo lo muestra según la moneda que elijas)

**Ejemplo 2 — un AS IS:**

`iPhone 14 Pro 128 100% (Gold) AS IS` se carga igual que el anterior, pero con:
- Estado: `AS IS`

Recordá tu propia aclaración de la planilla: "AS IS es nuevo/semi nuevo sin caja con nuestra garantía". Cargalo así para que el comprador vea esa distinción en el catálogo.

**Ejemplo 3 — un equipo "SEÑADO" (con seña, no disponible para vender de nuevo):**

Estos equipos de tu planilla (por ejemplo `iPhone 14 Pro Max 128 100% (Black)`, marcado SEÑADO) ya tienen una seña de otro cliente. No los cargues como "Disponible", porque el catálogo los mostraría a la venta:
- Si el cliente todavía puede arrepentirse: cargalo y ponelo en Estado **Pausado** (así queda guardado pero no se ve en el catálogo público).
- Si ya se vendió: no lo cargues, o cargalo y marcalo **Vendido** directamente.

**Sobre "Ciclos":** el formulario tiene un campo opcional "Ciclos" para cuando quieras aclarar el desgaste de una batería con ese dato (por ejemplo, si algún día anotás "105 ciclos" en la planilla). Hoy tu stock no lo usa; dejalo vacío si no aplica.

---

## 3. Cargar rápido con "Duplicar"

Para no tipear todo de nuevo en cada iPhone del mismo modelo:

1. Cargá el **primer** equipo de un modelo completo, con todos sus datos.
2. Para el resto de ese modelo, abrí ese producto en la lista y tocá **Duplicar**.
3. El formulario se abre con todo prellenado ("Duplicando «nombre»…"). Cambiá solo lo que varía: **batería, color y precio** (y el estado, si es AS IS en vez de Usado).
4. Guardá. El original queda intacto y el nuevo equipo aparece como un producto aparte.

Con esto, cargar 5 iPhone 14 distintos es: cargar el primero a mano, y "Duplicar + 3 cambios" cuatro veces.

---

## 4. El día a día, después de la carga inicial

- **Se vendió una unidad (iPhone, MacBook sellado si es unidad única, etc.):** en la lista de productos, tocá **Vendido** y confirmá. Desaparece del catálogo público al instante.
- **Se vendió una unidad de un accesorio "Por cantidad" (fundas, cargadores, AirPods…):** tocá **Registrar venta**, poné la cantidad vendida y confirmá. El stock baja solo; si llega a 0, el producto deja de listarse solo hasta que vuelvas a tener stock.
- **Querés pausar algo sin borrarlo** (por ejemplo, mientras esperás que llegue un color): usá el interruptor "Disponible" del producto.
- **Cambiar la batería o el precio de un equipo ya cargado:** Editar → cambiar el campo → Guardar. El cambio se ve en el catálogo público de inmediato, sin esperar nada.
- **Un equipo se reactiva** (se cayó una venta, o volvió a estar disponible): tocá **Reactivar** si estaba "Vendido", o el interruptor "Disponible" si estaba pausado.

---

## 5. Fotos

Son opcionales. Si no subís una foto, el catálogo muestra un ícono genérico en su lugar — no rompe nada ni queda "feo", pero un producto con foto real siempre vende más. Podés agregarla en cualquier momento, no hace falta tenerla lista para publicar.
