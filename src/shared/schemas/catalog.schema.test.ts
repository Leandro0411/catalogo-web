import { describe, expect, it } from 'vitest';
import { attributeDefSchema, categoryConfigSchema, choiceSchema } from './catalog.schema';

describe('attributeDefSchema', () => {
  it('acepta un atributo numérico con filtro min', () => {
    const result = attributeDefSchema.safeParse({
      key: 'bateria',
      label: 'Batería',
      type: 'number',
      unit: '%',
      filter: 'min',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza un enum sin options', () => {
    const result = attributeDefSchema.safeParse({ key: 'color', label: 'Color', type: 'enum' });
    expect(result.success).toBe(false);
  });

  it('rechaza el filtro min/max en un atributo de texto', () => {
    const result = attributeDefSchema.safeParse({
      key: 'condicion',
      label: 'Condición',
      type: 'text',
      filter: 'min',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza el filtro multi en un atributo numérico', () => {
    const result = attributeDefSchema.safeParse({
      key: 'bateria',
      label: 'Batería',
      type: 'number',
      filter: 'multi',
    });
    expect(result.success).toBe(false);
  });
});

describe('categoryConfigSchema', () => {
  it('acepta la categoría vapes de BANNED', () => {
    const result = categoryConfigSchema.safeParse({
      key: 'vapes',
      name: 'Vapes',
      choiceLabel: 'Sabor',
      defaultStockMode: 'availability',
      defaultCurrency: 'ARS',
      attributeSchema: [{ key: 'puffs', label: 'Puffs', type: 'number', unit: 'puffs' }],
    });
    expect(result.success).toBe(true);
  });

  it('aplica los valores por defecto', () => {
    const result = categoryConfigSchema.parse({ key: 'general', name: 'General' });
    expect(result.sortOrder).toBe(0);
    expect(result.attributeSchema).toEqual([]);
    expect(result.choiceLabel).toBeNull();
    expect(result.defaultStockMode).toBe('availability');
    expect(result.defaultCurrency).toBeNull();
  });

  it('rechaza claves de atributo duplicadas', () => {
    const result = categoryConfigSchema.safeParse({
      key: 'iphone',
      name: 'iPhone',
      attributeSchema: [
        { key: 'capacidad', label: 'Capacidad', type: 'text' },
        { key: 'capacidad', label: 'Capacidad 2', type: 'text' },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('choiceSchema', () => {
  it('acepta un valor disponible', () => {
    expect(choiceSchema.safeParse({ value: 'Rojo', available: true }).success).toBe(true);
  });

  it('rechaza un valor vacío', () => {
    expect(choiceSchema.safeParse({ value: '   ', available: true }).success).toBe(false);
  });
});
