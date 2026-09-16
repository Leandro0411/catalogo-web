import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { tenantConfigSchema } from '../src/shared/schemas/tenant.schema';
import { detectImageType } from '../src/shared/domain/image-type';
import { MAX_LOGO_BYTES } from '../src/shared/constants';
import { buildTenantWithCategoriesSql } from './lib/tenant-sql';
import { sqlValue } from './lib/sql';
import { d1ExecuteFile, d1Query, kvDelete, kvPutFile } from './lib/wrangler';

interface TenantIdRow {
  id: string;
  logo_key: string | null;
}

function uploadLogo(slug: string, filePath: string, target: 'local' | 'remote'): void {
  const bytes = readFileSync(filePath);
  const type = detectImageType(new Uint8Array(bytes));

  if (type === null) {
    console.error('El logo debe ser PNG, JPEG o WebP (SVG no está permitido).');
    process.exit(1);
    return;
  }

  if (bytes.length > MAX_LOGO_BYTES) {
    console.error(`El logo supera el máximo de ${MAX_LOGO_BYTES} bytes.`);
    process.exit(1);
    return;
  }

  const rows = d1Query<TenantIdRow>(
    `SELECT id, logo_key FROM tenants WHERE slug = ${sqlValue(slug)}`,
    target,
  );
  const tenant = rows[0];

  if (!tenant) {
    console.error(`No existe el tenant "${slug}".`);
    process.exit(1);
    return;
  }

  const newLogoKey = `t/${tenant.id}/logo-${crypto.randomUUID()}`;
  kvPutFile(newLogoKey, filePath, type, target);

  const updateSql = `UPDATE tenants SET logo_key = ${sqlValue(newLogoKey)}, updated_at = datetime('now') WHERE id = ${sqlValue(tenant.id)};`;
  const tempFile = join(tmpdir(), `tenant-logo-${crypto.randomUUID()}.sql`);
  writeFileSync(tempFile, updateSql, 'utf-8');
  d1ExecuteFile(tempFile, target);

  if (tenant.logo_key) {
    try {
      kvDelete(tenant.logo_key, target);
    } catch (error) {
      console.warn(
        `No se pudo borrar el logo anterior (${tenant.logo_key}): ${(error as Error).message}`,
      );
    }
  }
}

function upsert(filePath: string, target: 'local' | 'remote', logoPath: string | undefined): void {
  const raw: unknown = JSON.parse(readFileSync(filePath, 'utf-8'));
  const parsed = tenantConfigSchema.safeParse(raw);

  if (!parsed.success) {
    console.error(`Configuración de tenant inválida en ${filePath}:`);
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
    return;
  }

  const id = crypto.randomUUID();
  const sql = buildTenantWithCategoriesSql(parsed.data, id);
  const tempFile = join(tmpdir(), `tenant-upsert-${id}.sql`);
  writeFileSync(tempFile, sql, 'utf-8');
  d1ExecuteFile(tempFile, target);

  if (logoPath) {
    uploadLogo(parsed.data.slug, logoPath, target);
  }
}

function main(): void {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      remote: { type: 'boolean', default: false },
      logo: { type: 'string' },
    },
  });

  const [command, file] = positionals;

  if (command !== 'upsert' || !file) {
    console.error('Uso: tenant upsert <archivo.json> [--logo <ruta>] [--remote]');
    process.exit(1);
    return;
  }

  upsert(file, values.remote ? 'remote' : 'local', values.logo);
}

main();
