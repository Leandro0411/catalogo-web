import { describe, expect, it } from 'vitest';
import { formatAttributeValue } from './attributes';
import type { AttributeDef } from '../types/catalog.types';

describe('formatAttributeValue', () => {
  it('pega el símbolo % sin espacio', () => {
    const def: AttributeDef = { key: 'bateria', label: 'Batería', type: 'number', unit: '%' };
    expect(formatAttributeValue(def, 87)).toBe('87%');
  });

  it('separa otras unidades con un espacio y usa miles es-AR', () => {
    const def: AttributeDef = { key: 'puffs', label: 'Puffs', type: 'number', unit: 'puffs' };
    expect(formatAttributeValue(def, 30000)).toBe('30.000 puffs');
  });

  it('devuelve el texto tal cual para atributos de tipo texto o enum', () => {
    const def: AttributeDef = { key: 'condicion', label: 'Condición', type: 'enum' };
    expect(formatAttributeValue(def, 'Sellado')).toBe('Sellado');
  });
});
