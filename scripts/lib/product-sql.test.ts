import { describe, expect, it } from 'vitest';
import type { DevProductFixture } from './product-sql';
import { buildProductInsertSql } from './product-sql';

const theBlackSheep: DevProductFixture = {
  tenantSlug: 'banned',
  categoryKey: 'vapes',
  name: 'THE BLACK SHEEP',
  priceCents: 2600000,
  currency: 'ARS',
  stockMode: 'availability',
  status: 'active',
  attributes: { puffs: 30000 },
  choices: [
    { value: 'Grape / Strawberry Kiwi 🍇🍓🥝', available: true },
    { value: 'Watermelon Ice 🍉🧊', available: true },
    { value: 'Peach Mango 🍑🥭', available: false },
  ],
};

describe('buildProductInsertSql', () => {
  it('resuelve tenant_id y category_id por slug/key con subselects', () => {
    const sql = buildProductInsertSql(theBlackSheep, 'fixed-id');

    expect(sql).toContain('INSERT INTO products');
    expect(sql).toContain("(SELECT id FROM tenants WHERE slug = 'banned')");
    expect(sql).toContain("AND key = 'vapes'");
    expect(sql).toContain("'THE BLACK SHEEP'");
    expect(sql).toContain('2600000');
  });

  it('serializa attributes y choices como JSON escapado', () => {
    const sql = buildProductInsertSql(theBlackSheep, 'fixed-id');

    expect(sql).toContain('"puffs":30000');
    expect(sql).toContain('Grape / Strawberry Kiwi');
  });
});
