import { describe, expect, it } from 'vitest';
import type { TenantConfig } from '../../src/shared/types/tenant.types';
import { buildTenantUpsertSql, buildTenantWithCategoriesSql } from './tenant-sql';

const bannedConfig: TenantConfig = {
  slug: 'banned',
  name: 'BANNED',
  primaryColor: '#111111',
  whatsapp: '5490000000000',
  currency: 'ARS',
  ageGate: true,
  noindex: true,
  isActive: true,
  categories: [
    {
      key: 'vapes',
      name: 'Vapes',
      sortOrder: 0,
      attributeSchema: [{ key: 'puffs', label: 'Puffs', type: 'number', unit: 'puffs' }],
      choiceLabel: 'Sabor',
      defaultStockMode: 'availability',
      defaultCurrency: 'ARS',
    },
  ],
};

describe('buildTenantUpsertSql', () => {
  it('genera un INSERT con los valores del tenant', () => {
    const sql = buildTenantUpsertSql(bannedConfig, 'fixed-id');

    expect(sql).toContain('INSERT INTO tenants');
    expect(sql).toContain("'fixed-id'");
    expect(sql).toContain("'banned'");
    expect(sql).toContain("'BANNED'");
    expect(sql).toContain("'#111111'");
    expect(sql).toContain('1, 1, 1');
  });

  it('actualiza por conflicto de slug sin duplicar filas', () => {
    const sql = buildTenantUpsertSql(bannedConfig, 'fixed-id');

    expect(sql).toContain('ON CONFLICT(slug) DO UPDATE SET');
    expect(sql).toContain("updated_at = datetime('now')");
  });
});

describe('buildTenantWithCategoriesSql', () => {
  it('incluye el upsert del tenant y de cada una de sus categorías', () => {
    const sql = buildTenantWithCategoriesSql(bannedConfig, 'fixed-id');

    expect(sql).toContain('INSERT INTO tenants');
    expect(sql).toContain('INSERT INTO categories');
    expect(sql).toContain("'vapes'");
  });

  it('no genera categorías si el tenant no tiene ninguna', () => {
    const sql = buildTenantWithCategoriesSql({ ...bannedConfig, categories: [] }, 'fixed-id');

    expect(sql).toContain('INSERT INTO tenants');
    expect(sql).not.toContain('INSERT INTO categories');
  });
});
