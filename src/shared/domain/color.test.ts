import { describe, expect, it } from 'vitest';
import { contrastText } from './color';

describe('contrastText', () => {
  it('devuelve blanco para un fondo muy oscuro', () => {
    expect(contrastText('#111111')).toBe('#FFFFFF');
  });

  it('devuelve negro para un fondo muy claro', () => {
    expect(contrastText('#FFFF00')).toBe('#000000');
  });
});
