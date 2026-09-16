import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { tenantConfigSchema } from '../src/shared/schemas/tenant.schema';
import type { TenantConfig } from '../src/shared/types/tenant.types';
import { buildTenantWithCategoriesSql } from './lib/tenant-sql';
import { buildProductInsertSql, type DevProductFixture } from './lib/product-sql';
import { sqlValue } from './lib/sql';
import { d1ExecuteFile } from './lib/wrangler';

const SEED_TENANT_SLUGS = ['banned', 'demo'] as const;
const PROJECT_ROOT = join(import.meta.dirname, '..');
const DEV_PRODUCTS_FIXTURE_PATH = join(import.meta.dirname, 'fixtures', 'dev-products.json');

function readTenantConfig(slug: string): TenantConfig {
  const filePath = join(PROJECT_ROOT, 'tenants', `${slug}.json`);
  const raw: unknown = JSON.parse(readFileSync(filePath, 'utf-8'));
  const parsed = tenantConfigSchema.safeParse(raw);

  if (!parsed.success) {
    console.error(`Configuración de tenant inválida en ${filePath}:`);
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return parsed.data;
}

function main(): void {
  const { values } = parseArgs({ options: { remote: { type: 'boolean', default: false } } });

  if (values.remote) {
    console.error('seed:dev es solo para datos locales; no acepta --remote.');
    process.exit(1);
    return;
  }

  const fixtures = JSON.parse(
    readFileSync(DEV_PRODUCTS_FIXTURE_PATH, 'utf-8'),
  ) as DevProductFixture[];
  const statements: string[] = [];

  for (const slug of SEED_TENANT_SLUGS) {
    const config = readTenantConfig(slug);
    statements.push(buildTenantWithCategoriesSql(config, crypto.randomUUID()));
    statements.push(
      `DELETE FROM products WHERE tenant_id = (SELECT id FROM tenants WHERE slug = ${sqlValue(slug)});`,
    );
  }

  for (const fixture of fixtures) {
    statements.push(buildProductInsertSql(fixture, crypto.randomUUID()));
  }

  const sql = statements.join('\n');
  const tempFile = join(tmpdir(), `seed-dev-${crypto.randomUUID()}.sql`);
  writeFileSync(tempFile, sql, 'utf-8');
  d1ExecuteFile(tempFile, 'local');
}

main();
