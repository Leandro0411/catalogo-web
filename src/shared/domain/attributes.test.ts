import { describe, expect, it } from 'vitest';
import { formatAttributeValue, validateAttributes } from './attributes';
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

describe('validateAttributes', () => {
  const puffsSchema: AttributeDef[] = [
    { key: 'puffs', label: 'Puffs', type: 'number', required: true },
  ];

  it('acepta valores válidos y los devuelve normalizados', () => {
    const result = validateAttributes(puffsSchema, { puffs: '30000' });
    expect(result).toEqual({ ok: true, value: { puffs: 30000 } });
  });

  it('marca una clave desconocida', () => {
    const result = validateAttributes(puffsSchema, { puffs: 30000, colorInexistente: 'rojo' });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.colorInexistente).toBe('Atributo desconocido');
  });

  it('marca un requerido vacío como obligatorio', () => {
    const result = validateAttributes(puffsSchema, { puffs: '' });
    expect(result).toEqual({ ok: false, errors: { puffs: 'Obligatorio' } });
  });

  it('omite un opcional vacío', () => {
    const optionalSchema: AttributeDef[] = [{ key: 'nota', label: 'Nota', type: 'text' }];
    const result = validateAttributes(optionalSchema, { nota: '' });
    expect(result).toEqual({ ok: true, value: {} });
  });

  it('rechaza un número no finito o negativo', () => {
    expect(validateAttributes(puffsSchema, { puffs: 'no-numero' }).ok).toBe(false);
    expect(validateAttributes(puffsSchema, { puffs: -5 }).ok).toBe(false);
  });

  it('rechaza un valor enum fuera de las opciones', () => {
    const enumSchema: AttributeDef[] = [
      { key: 'condicion', label: 'Condición', type: 'enum', options: ['Sellado', 'Usado'] },
    ];
    const result = validateAttributes(enumSchema, { condicion: 'Roto' });
    expect(result).toEqual({ ok: false, errors: { condicion: 'Valor no permitido' } });
  });

  it('recorta un texto a 60 caracteres', () => {
    const textSchema: AttributeDef[] = [{ key: 'nota', label: 'Nota', type: 'text' }];
    const longText = 'a'.repeat(80);
    const result = validateAttributes(textSchema, { nota: `  ${longText}  ` });
    expect(result).toEqual({ ok: true, value: { nota: 'a'.repeat(60) } });
  });
});
