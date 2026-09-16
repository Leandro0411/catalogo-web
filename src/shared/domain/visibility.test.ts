import { describe, expect, it } from 'vitest';
import { getHiddenReason, isPubliclyVisible } from './visibility';

const visibleProduct = {
  status: 'active' as const,
  stockMode: 'availability' as const,
  stockQty: null,
  choices: [{ value: 'Rojo', available: true }],
};

const categoryWithChoice = { choiceLabel: 'Sabor' };
const categoryWithoutChoice = { choiceLabel: null };

describe('getHiddenReason', () => {
  it('devuelve PAUSED si el producto está pausado', () => {
    expect(getHiddenReason({ ...visibleProduct, status: 'paused' }, categoryWithoutChoice)).toBe(
      'PAUSED',
    );
  });

  it('devuelve SOLD si el producto está vendido', () => {
    expect(getHiddenReason({ ...visibleProduct, status: 'sold' }, categoryWithoutChoice)).toBe(
      'SOLD',
    );
  });

  it('devuelve OUT_OF_STOCK si el modo es quantity y no hay stock', () => {
    const product = { ...visibleProduct, stockMode: 'quantity' as const, stockQty: 0 };
    expect(getHiddenReason(product, categoryWithoutChoice)).toBe('OUT_OF_STOCK');
  });

  it('devuelve NO_CHOICES_AVAILABLE si ningún sabor está disponible', () => {
    const product = { ...visibleProduct, choices: [{ value: 'Rojo', available: false }] };
    expect(getHiddenReason(product, categoryWithChoice)).toBe('NO_CHOICES_AVAILABLE');
  });

  it('devuelve null si el producto es visible', () => {
    expect(getHiddenReason(visibleProduct, categoryWithChoice)).toBeNull();
  });
});

describe('isPubliclyVisible', () => {
  it('es true cuando no hay motivo de ocultamiento', () => {
    expect(isPubliclyVisible(visibleProduct, categoryWithChoice)).toBe(true);
  });

  it('es false cuando hay un motivo de ocultamiento', () => {
    expect(isPubliclyVisible({ ...visibleProduct, status: 'sold' }, categoryWithChoice)).toBe(
      false,
    );
  });
});
