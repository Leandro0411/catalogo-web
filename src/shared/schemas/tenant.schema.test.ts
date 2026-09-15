import { describe, expect, it } from 'vitest';
import { tenantConfigSchema } from './tenant.schema';
import bannedFixture from '../../../tenants/banned.json';

describe('tenantConfigSchema', () => {
  it('acepta el tenant banned', () => {
    expect(tenantConfigSchema.safeParse(bannedFixture).success).toBe(true);
  });

  it('rechaza un slug reservado', () => {
    const result = tenantConfigSchema.safeParse({ ...bannedFixture, slug: 'admin' });
    expect(result.success).toBe(false);
  });

  it('rechaza un color inválido', () => {
    const result = tenantConfigSchema.safeParse({ ...bannedFixture, primaryColor: 'red' });
    expect(result.success).toBe(false);
  });

  it('rechaza un whatsapp inválido', () => {
    const result = tenantConfigSchema.safeParse({ ...bannedFixture, whatsapp: '+54 9 261' });
    expect(result.success).toBe(false);
  });
});
