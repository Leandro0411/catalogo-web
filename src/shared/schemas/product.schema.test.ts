import { describe, expect, it } from 'vitest';
import { productInputSchema, statusInputSchema } from './product.schema';

function validInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    categoryId: '11111111-1111-4111-8111-111111111111',
    name: 'THE BLACK SHEEP',
    description: null,
    imageKey: null,
    priceCents: 2600000,
    currency: 'ARS',
    priceNote: null,
    stockMode: 'availability',
    stockQty: null,
    status: 'active',
    attributes: { puffs: 30000 },
    choices: [{ value: 'Grape', available: true }],
    ...overrides,
  };
}

describe('productInputSchema', () => {
  it('acepta un producto válido', () => {
    expect(productInputSchema.safeParse(validInput()).success).toBe(true);
  });

  it('rechaza un categoryId que no es uuid', () => {
    expect(productInputSchema.safeParse(validInput({ categoryId: 'no-es-uuid' })).success).toBe(
      false,
    );
  });

  it('rechaza un imageKey con formato inválido', () => {
    expect(productInputSchema.safeParse(validInput({ imageKey: 'ruta-invalida' })).success).toBe(
      false,
    );
  });

  it('acepta un imageKey con el formato t/<tenantId>/<uuid>', () => {
    const imageKey = 't/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222';
    expect(productInputSchema.safeParse(validInput({ imageKey })).success).toBe(true);
  });

  it('rechaza priceCents negativo', () => {
    expect(productInputSchema.safeParse(validInput({ priceCents: -1 })).success).toBe(false);
  });

  it('rechaza choices con valores repetidos sin distinguir mayúsculas', () => {
    const choices = [
      { value: 'Grape', available: true },
      { value: 'grape', available: false },
    ];
    expect(productInputSchema.safeParse(validInput({ choices })).success).toBe(false);
  });

  it('exige stockQty no nulo cuando stockMode es quantity', () => {
    expect(
      productInputSchema.safeParse(validInput({ stockMode: 'quantity', stockQty: null })).success,
    ).toBe(false);
    expect(
      productInputSchema.safeParse(validInput({ stockMode: 'quantity', stockQty: 5 })).success,
    ).toBe(true);
  });

  it('exige stockQty nulo cuando stockMode no es quantity', () => {
    expect(
      productInputSchema.safeParse(validInput({ stockMode: 'availability', stockQty: 5 })).success,
    ).toBe(false);
  });

  it('rechaza status sold con un stockMode distinto de unit', () => {
    expect(
      productInputSchema.safeParse(validInput({ status: 'sold', stockMode: 'availability' }))
        .success,
    ).toBe(false);
  });

  it('acepta status sold con stockMode unit', () => {
    expect(
      productInputSchema.safeParse(validInput({ status: 'sold', stockMode: 'unit' })).success,
    ).toBe(true);
  });
});

describe('statusInputSchema', () => {
  it('acepta un estado válido', () => {
    expect(statusInputSchema.safeParse({ status: 'paused' }).success).toBe(true);
  });

  it('rechaza un estado inválido', () => {
    expect(statusInputSchema.safeParse({ status: 'archived' }).success).toBe(false);
  });
});
