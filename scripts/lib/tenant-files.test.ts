import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tenantConfigSchema } from '../../src/shared/schemas/tenant.schema';

const TENANTS_DIR = join(import.meta.dirname, '..', '..', 'tenants');

describe('archivos de tenants/', () => {
  const files = readdirSync(TENANTS_DIR).filter((file) => file.endsWith('.json'));

  it('encuentra al menos un archivo de tenant', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} valida contra tenantConfigSchema`, () => {
      const raw: unknown = JSON.parse(readFileSync(join(TENANTS_DIR, file), 'utf-8'));
      const parsed = tenantConfigSchema.safeParse(raw);

      if (!parsed.success) {
        throw new Error(
          `${file}: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
        );
      }

      expect(parsed.success).toBe(true);
    });
  }
});
