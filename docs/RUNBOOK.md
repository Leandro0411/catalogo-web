# Runbook de producción

Comandos operativos para desplegar, respaldar, restaurar y diagnosticar el catálogo en Cloudflare. Todos se corren desde la raíz del repo, con `npx wrangler login` ya hecho.

## Despliegue

```bash
npm run lint && npm run typecheck && npm test && npm run db:migrate:remote && npm run deploy
```

Si alguno de los pasos falla, no sigas con el siguiente: corregí y volvé a correr la cadena completa.

## Backup mensual

```bash
npx wrangler d1 export catalogo-db --remote --output backups/catalogo-<fecha>.sql
```

`backups/` está en `.gitignore`: el archivo exportado **no se commitea**. Guardalo fuera del repo (por ejemplo, en un backup cifrado o un storage aparte).

## Restauración (Time Travel, últimos 7 días)

D1 conserva el historial de los últimos 30 días, pero el plan de riesgo de este proyecto asume una ventana práctica de 7 días para restaurar sin pérdida operativa relevante:

```bash
npx wrangler d1 time-travel restore catalogo-db --timestamp <ISO-8601>
```

Ejemplo: `--timestamp 2026-09-20T15:00:00.000Z`. También acepta `--bookmark` si ya tenés uno guardado de una operación anterior.

## Rollback del Worker

```bash
npx wrangler rollback
```

Sin argumentos, wrangler muestra las versiones desplegadas y pide elegir a cuál volver. Para automatizarlo, pasá el `version-id` como positional.

## Administradores

Alta:

```bash
npm run admin -- create --tenant <slug> --username <usuario> --remote
```

Sin `--password`, genera una contraseña aleatoria que se imprime **una sola vez** en la terminal. Entregala al dueño del negocio por un canal privado (nunca por el repo, logs o este runbook).

Reseteo de contraseña (cierra las sesiones activas del admin):

```bash
npm run admin -- reset-password --username <usuario> --remote
```

## Tenants

Alta o modificación de datos (nombre, WhatsApp, color, categorías):

```bash
npm run tenant -- upsert tenants/<slug>.json --remote
```

Cambio de logo (PNG, JPG o WebP, máximo 300 KB; rechaza SVG):

```bash
npm run tenant -- upsert tenants/<slug>.json --logo <ruta-del-archivo> --remote
```

## Plan B de aislamiento (riesgo R02)

Si una cuenta de Cloudflare queda comprometida, suspendida o inaccesible, el mismo código se puede desplegar en otra cuenta sin cambios:

1. `npx wrangler login` con la cuenta nueva.
2. Crear una base D1 y un namespace KV nuevos (`npx wrangler d1 create catalogo-db`, `npx wrangler kv namespace create catalogo-images`) y actualizar los `id` en `wrangler.jsonc`.
3. Repetir el despliegue completo de este runbook contra esa cuenta.

No hace falta tocar el código de la aplicación: el aislamiento entre cuentas es un cambio de configuración, no de lógica.

## Diagnóstico

Logs en vivo:

```bash
npx wrangler tail
```

Para historial y filtros más ricos, usar Workers Logs en el panel de Cloudflare (Workers & Pages → catalogo → Logs).

Si `wrangler tail` muestra errores de límite de CPU (riesgo R03), la opción es pasar a Workers Paid (USD 5/mes), que levanta el límite de tiempo de CPU por request.
