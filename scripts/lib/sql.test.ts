import { describe, expect, it } from 'vitest';
import { sqlJson, sqlValue } from './sql';

describe('sqlValue', () => {
  it('duplica las comillas simples', () => {
    expect(sqlValue("O'Brien")).toBe("'O''Brien'");
  });

  it('convierte null a NULL', () => {
    expect(sqlValue(null)).toBe('NULL');
  });

  it('convierte booleanos a 1/0', () => {
    expect(sqlValue(true)).toBe('1');
    expect(sqlValue(false)).toBe('0');
  });

  it('lanza si el número no es finito', () => {
    expect(() => sqlValue(NaN)).toThrow();
    expect(() => sqlValue(Infinity)).toThrow();
  });
});

describe('sqlJson', () => {
  it('serializa a JSON y escapa el resultado', () => {
    expect(sqlJson({ a: "O'Brien" })).toBe(`'{"a":"O''Brien"}'`);
  });
});
