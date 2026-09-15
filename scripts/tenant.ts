import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { tenantConfigSchema } from '../src/shared/schemas/tenant.schema';
import { buildTenantUpsertSql } from './lib/tenant-sql';
import { d1ExecuteFile } from './lib/wrangler';

function upsert(filePath: string, target: 'local' | 'remote'): void {
  const raw: unknown = JSON.parse(readFileSync(filePath, 'utf-8'));
  const parsed = tenantConfigSchema.safeParse(raw);

  if (!parsed.success) {
    console.error(`Configuración de tenant inválida en ${filePath}:`);
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const id = crypto.randomUUID();
  const sql = buildTenantUpsertSql(parsed.data, id);
  const tempFile = join(tmpdir(), `tenant-upsert-${id}.sql`);
  writeFileSync(tempFile, sql, 'utf-8');
  d1ExecuteFile(tempFile, target);
}

function main(): void {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      remote: { type: 'boolean', default: false },
    },
  });

  const [command, file] = positionals;

  if (command !== 'upsert' || !file) {
    console.error('Uso: tenant upsert <archivo.json> [--remote]');
    process.exit(1);
    return;
  }

  upsert(file, values.remote ? 'remote' : 'local');
}

main();
