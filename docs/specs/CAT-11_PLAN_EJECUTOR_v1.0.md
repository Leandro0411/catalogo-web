# Plan de Ejecución — CAT-11 Puesta en producción de miphone y carga inicial

## Metadatos

- **ID:** CAT-11 (fase B, 11 de 11 — cierra el proyecto)
- **Versión:** v1.0
- **Fecha:** 2026-09-14
- **Origen:** `docs/specs/CATALOGO_ARQUITECTO_v1.0.md` (D21, riesgo R13) y `docs/specs/CATALOGO_APPLE_ELICITADOR_NUEVO_v1.0.md` (T05, planilla "Listado miphone.mza").
- **Destinatario:** Agente Ejecutor + humano (pasos de aprovisionamiento y carga a cargo del humano y del emprendedor).
- **Base de código requerida:** CAT-07, CAT-08 y CAT-10 completos (fases A y B terminadas) e integrados en `main`. Rama `cat-11-produccion-miphone`.
- **Stack y comandos:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run deploy`, `npm run db:migrate:remote`, `npm run tenant`, `npm run admin`. Runbook en `docs/RUNBOOK.md`.

---

## Misión

Publicar el catálogo de miphone con su marca y WhatsApp reales, y guiar al emprendedor para cargar el stock vigente de la planilla (~60 filas) desde el panel usando "Duplicar". El resultado debe verificarse contra la planilla sin errores de precio ni de atributos.

---

## Guardarraíles (No Negociables)

### Lo que NO se modifica
- Código fuente, migraciones y `docs/specs/` (esta tarea es aprovisionamiento, documentación operativa y verificación). Si aparece un defecto de código, se reporta al humano en lugar de corregirlo acá.

### Convenciones a respetar
- Runbook de `docs/RUNBOOK.md` para todo comando remoto.
- Contraseñas por canal privado; nunca en el repositorio ni en el reporte.
- `tenants/demo.json` no se aprovisiona en remoto.

### Constraints técnicas
- miphone es indexable (`noindex: false`) y sin aviso +18 (`ageGate: false`), salvo que el humano indique lo contrario.

---

## Entorno de Ejecución y Verificación

- **Producción:** `https://catalogo.<subdominio>.workers.dev/miphone`.
- **Datos reales requeridos (los provee el emprendedor):**
  - número de WhatsApp en formato internacional sin `+`;
  - color de marca;
  - logo (≤ 300 KB);
  - usuario admin;
  - confirmación de los valores de "Estado" (hoy Sellado / Usado / AS IS);
  - acceso de lectura a la planilla vigente.
- **Limitación declarada:** la carga de productos la hace el emprendedor (unas 1–1,5 h); el agente solo prepara la guía y verifica.

---

## Archivos a Crear

1. `docs/GUIA_CARGA_MIPHONE.md` — guía de carga para el emprendedor, en lenguaje no técnico.

## Archivos a Modificar

1. `tenants/miphone.json` — datos reales y, si el emprendedor lo pide, valores de "Estado".
2. `docs/RUNBOOK.md` — sección del tenant miphone.
3. `README.md` — URL pública de miphone.

---

## Tareas (Orden Topológico)

### T01 — Guía de carga

**Qué hacer:** redactar `docs/GUIA_CARGA_MIPHONE.md` con:
1. **Correspondencia de bloques** de la planilla con categorías y modo de stock:

   | Bloque de la planilla | Categoría | Modo de stock | Moneda |
   |---|---|---|---|
   | iPhones SELLADOS | iPhones | unidad única o por cantidad si hay varios iguales | USD |
   | iPhones usados seleccionados PREMIUM | iPhones | unidad única, estado Usado o AS IS | USD |
   | Macbooks e iPads SELLADOS | MacBooks / iPads | por cantidad | USD |
   | Accesorios | Accesorios o AirPods | por cantidad | ARS; la columna "2x" va en "Nota de precio" (ej. `2x $16.000`) |

2. **Cómo leer el nombre de la planilla**, con 3 ejemplos reales:
   - "iPhone 15 Pro Max 256 87% (White)" → Modelo "iPhone 15 Pro Max", Capacidad 256GB, Color White, Batería 87, Estado Usado;
   - una fila AS IS;
   - una fila con ciclos ("105 ciclos" → campo Ciclos).
3. **Flujo rápido con Duplicar:** cargar el primer equipo de cada modelo; para los siguientes, "Duplicar" y cambiar solo batería, color y precio.
4. **Día a día:** "Vendido" para unidades; "Registrar venta" para ítems por cantidad; cómo pausar; cómo editar batería o precio.
5. **Fotos:** opcionales; si no hay foto se muestra un ícono genérico.

**Criterio de validación:** revisión humana de la guía.

**Depende de:** Ninguna.

### T02 — Aprovisionamiento (asistido por el humano)

**Qué hacer:**
1. Actualizar `tenants/miphone.json` con los datos reales.
2. El humano ejecuta (el agente guía y verifica las salidas):
   ```bash
   npm run lint && npm run typecheck && npm test
   npm run db:migrate:remote
   npm run tenant -- upsert tenants/miphone.json --logo <ruta-del-logo> --remote
   npm run admin -- create --tenant miphone --username <usuario> --remote
   npm run deploy
   ```
3. El humano entrega la contraseña al emprendedor por un canal privado, junto con la guía de T01.

**Criterio de validación:** la consulta
```bash
npx wrangler d1 execute catalogo-db --remote --command "SELECT slug, whatsapp, age_gate, noindex FROM tenants"
```
muestra `banned` y `miphone` (con su número real, `age_gate = 0` y `noindex = 0`) y no muestra `demo`.

**Depende de:** T01.

### T03 — Carga inicial y control contra la planilla

**Qué hacer:**
1. El emprendedor carga el stock vigente siguiendo la guía.
2. Verificación por muestreo:
   - elegir 10 filas de la planilla (al menos 4 iPhones usados, 1 sellado, 1 MacBook o iPad y 2 accesorios, uno con "2x");
   - comparar con el catálogo público precio, moneda, capacidad, color, batería, estado y nota;
   - registrar la tabla del muestreo en el reporte (fila, dato de la planilla, dato publicado, OK o diferencia).
3. Si hay diferencias, el emprendedor las corrige y se vuelven a verificar esas filas.

**Criterio de validación:** 10 de 10 filas del muestreo en OK (criterio T05 del contrato Apple: el catálogo refleja el stock real sin errores de precio o atributos).

**Depende de:** T02.

### T04 — Prueba manual en producción

**Qué hacer:** ejecutar el checklist de Verificación Final en un Android y un iPhone y registrar el resultado de cada ítem.

**Criterio de validación:** todos los ítems en OK, o fallas reportadas con diagnóstico.

**Depende de:** T03.

---

## Tests Obligatorios

Los criterios de aceptación de Apple ya están cubiertos por tests automáticos en CAT-08 (AC02, AC04), CAT-09 (AC01, AC05, AC06) y CAT-10 (AC03). En esta tarea se verifican **manualmente en producción** (ver checklist) junto con el criterio de T05 del contrato (muestreo contra la planilla, T03 de este plan).

---

## Verificación Final

Automáticas (antes del despliegue):
1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` sin errores.

**Manuales en producción** (Android e iPhone; verificación manual declarada):

| # | Criterio | Pasos | Resultado esperado |
|---|---|---|---|
| M1 | Apple AC01 + O1 | Abrir `/miphone` sin sesión | Sin aviso +18; secciones iPhones, MacBooks, iPads, AirPods y Accesorios con los datos cargados |
| M2 | Apple AC03 | Filtrar iPhones + batería ≥ 95% + precio máx. USD 700 | Solo equipos que cumplen las tres condiciones |
| M3 | Apple AC05 | Carrito con un iPhone (USD) y un accesorio (ARS) → enviar | WhatsApp del número real con dos totales separados y el `[ref]` del iPhone |
| M4 | Apple AC04 | En el panel, marcar "Vendido" una unidad de prueba | Desaparece del catálogo; luego "Reactivar" o eliminarla |
| M5 | Apple AC02 | "Registrar venta" de 1 en un accesorio y recargar | El stock baja en 1 y sigue listado; luego corregir el stock desde Editar |
| M6 | Apple AC06 | Editar la batería de un usado y recargar | Se ve el valor nuevo al instante |
| M7 | Vista previa | Pegar el link en WhatsApp | Título "miphone.mza" (o el nombre real) y logo |
| M8 | Indexación | `curl -I https://…/miphone` | Sin `X-Robots-Tag: noindex`; CSP presente |
| M9 | Aislamiento | Login como admin de miphone | No ve productos de BANNED; `/banned` sigue funcionando igual |

---

## Qué Hacer al Terminar

1. Reportar URL pública, archivos creados y modificados, tabla del muestreo, resultado de M1–M9 y desvíos. Sin contraseñas.
2. Sugerir al humano:
   - refrescar el Mapa del Sistema (v1.2, "sistema implementado");
   - pedir al Ingeniero de Requisitos la v1.1 de ambos contratos con los GAP-01…GAP-07 del análisis del Arquitecto.
3. No commitear ni pushear sin instrucción explícita.

---

## CHANGELOG

- v1.0 (2026-09-14): Versión inicial del plan.
