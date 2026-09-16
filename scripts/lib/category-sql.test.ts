import { describe, expect, it } from 'vitest';
import type { CategoryConfig } from '../../src/shared/types/catalog.types';
import { buildCategoryUpsertSql } from './category-sql';

const vapesCategory: CategoryConfig = {
  key: 'vapes',
  name: 'Vapes',
  sortOrder: 0,
  attributeSchema: [{ key: 'puffs', label: 'Puffs', type: 'number', unit: 'puffs' }],
  choiceLabel: 'Sabor',
  defaultStockMode: 'availability',
  defaultCurrency: 'ARS',
};

describe('buildCategoryUpsertSql', () => {
  it('resuelve el tenant_id por slug con un subselect', () => {
    const sql = buildCategoryUpsertSql('banned', vapesCategory, 'fixed-id');

    expect(sql).toContain('INSERT INTO categories');
    expect(sql).toContain("(SELECT id FROM tenants WHERE slug = 'banned')");
    expect(sql).toContain("'vapes'");
    expect(sql).toContain("'Sabor'");
  });

  it('actualiza por conflicto de (tenant_id, key) sin tocar la key', () => {
    const sql = buildCategoryUpsertSql('banned', vapesCategory, 'fixed-id');

    expect(sql).toContain('ON CONFLICT(tenant_id, key) DO UPDATE SET');
    expect(sql).not.toContain('key = excluded.key');
  });
});
