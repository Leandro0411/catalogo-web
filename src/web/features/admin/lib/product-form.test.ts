import { describe, expect, it } from 'vitest';
import {
  applyStockModeChange,
  emptyFormState,
  formStateFromProduct,
  toProductInput,
} from './product-form';
import type { AdminCategory, AdminProduct } from '../../../../shared/types/api.types';

const vapesCategory: AdminCategory = {
  id: '11111111-1111-4111-8111-111111111111',
  key: 'vapes',
  name: 'Vapes',
  sortOrder: 0,
  attributeSchema: [
    { key: 'puffs', label: 'Puffs', type: 'number', unit: 'puffs', required: true },
  ],
  choiceLabel: 'Sabor',
  defaultStockMode: 'availability',
  defaultCurrency: 'ARS',
};

const product: AdminProduct = {
  id: 'p1',
  categoryId: '11111111-1111-4111-8111-111111111111',
  categoryKey: 'vapes',
  name: 'THE BLACK SHEEP',
  description: 'Descripción',
  imageKey: null,
  priceCents: 2600050,
  currency: 'ARS',
  priceNote: '2x',
  stockMode: 'availability',
  stockQty: null,
  status: 'active',
  attributes: { puffs: 30000 },
  choices: [{ value: 'Grape', available: true }],
  hiddenReason: null,
  updatedAt: '2026-09-14 00:00:00',
};

describe('emptyFormState', () => {
  it('usa la moneda y el modo de stock por defecto de la categoría', () => {
    const state = emptyFormState(vapesCategory, 'USD');
    expect(state.currency).toBe('ARS');
    expect(state.stockMode).toBe('availability');
    expect(state.status).toBe('active');
  });

  it('usa la moneda del tenant si la categoría no tiene una por defecto', () => {
    const state = emptyFormState({ ...vapesCategory, defaultCurrency: null }, 'USD');
    expect(state.currency).toBe('USD');
  });
});

describe('formStateFromProduct', () => {
  it('convierte el producto a estado de formulario editable', () => {
    const state = formStateFromProduct(product);
    expect(state.name).toBe('THE BLACK SHEEP');
    expect(state.priceText).toBe('26000,50');
    expect(state.attributes.puffs).toBe('30000');
    expect(state.choices).toEqual([{ value: 'Grape', available: true }]);
  });
});

describe('toProductInput', () => {
  it('arma el ProductInput a partir de un formulario válido', () => {
    const state = {
      ...emptyFormState(vapesCategory, 'ARS'),
      name: 'ICE STORM',
      priceText: '28.000',
      attributes: { puffs: '25000' },
      choices: [{ value: 'Mint', available: true }],
    };

    const result = toProductInput(state, vapesCategory);

    expect('input' in result).toBe(true);
    if ('input' in result) {
      expect(result.input.priceCents).toBe(2800000);
      expect(result.input.attributes).toEqual({ puffs: 25000 });
    }
  });

  it('devuelve un error de precio si el texto es inválido', () => {
    const state = { ...emptyFormState(vapesCategory, 'ARS'), name: 'X', priceText: 'no-es-precio' };
    const result = toProductInput(state, vapesCategory);
    expect(result).toEqual({ errors: { price: 'Precio inválido' } });
  });

  it('devuelve errores de atributos si falta un valor requerido', () => {
    const state = { ...emptyFormState(vapesCategory, 'ARS'), name: 'X', priceText: '100' };
    const result = toProductInput(state, vapesCategory);
    expect(result).toEqual({ errors: { attributes: { puffs: 'Obligatorio' } } });
  });

  it('exige stockQty numérico cuando el modo es quantity', () => {
    const state = {
      ...emptyFormState(vapesCategory, 'ARS'),
      name: 'X',
      priceText: '100',
      attributes: { puffs: '1' },
      stockMode: 'quantity' as const,
      stockQty: 'no-es-numero',
    };
    const result = toProductInput(state, vapesCategory);
    expect(result).toEqual({ errors: { stockQty: 'Cantidad inválida' } });
  });
});

describe('applyStockModeChange', () => {
  it('vacía stockQty al salir de quantity', () => {
    const state = { ...emptyFormState(vapesCategory, 'ARS'), stockMode: 'quantity' as const, stockQty: '5' };
    const next = applyStockModeChange(state, 'availability');
    expect(next.stockQty).toBe('');
  });

  it('pone stockQty en 1 al pasar a quantity si estaba vacío', () => {
    const state = { ...emptyFormState(vapesCategory, 'ARS'), stockMode: 'availability' as const };
    const next = applyStockModeChange(state, 'quantity');
    expect(next.stockQty).toBe('1');
  });

  it('conserva stockQty al pasar a quantity si ya tenía un valor', () => {
    const state = {
      ...emptyFormState(vapesCategory, 'ARS'),
      stockMode: 'unit' as const,
      stockQty: '7',
    };
    const next = applyStockModeChange(state, 'quantity');
    expect(next.stockQty).toBe('7');
  });

  it('al salir de unit, el estado sold pasa a paused', () => {
    const state = {
      ...emptyFormState(vapesCategory, 'ARS'),
      stockMode: 'unit' as const,
      status: 'sold' as const,
    };
    const next = applyStockModeChange(state, 'availability');
    expect(next.status).toBe('paused');
  });

  it('no toca el estado si no estaba vendido al salir de unit', () => {
    const state = {
      ...emptyFormState(vapesCategory, 'ARS'),
      stockMode: 'unit' as const,
      status: 'active' as const,
    };
    const next = applyStockModeChange(state, 'availability');
    expect(next.status).toBe('active');
  });
});
