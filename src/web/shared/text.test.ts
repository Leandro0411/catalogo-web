import { describe, expect, it } from 'vitest';
import { pluralize } from './text';

describe('pluralize', () => {
  it('agrega "es" cuando la palabra termina en consonante', () => {
    expect(pluralize('Sabor', 3)).toBe('sabores');
  });

  it('agrega "s" cuando la palabra termina en vocal', () => {
    expect(pluralize('Bebida', 2)).toBe('bebidas');
  });

  it('devuelve la palabra en singular si count es 1', () => {
    expect(pluralize('Sabor', 1)).toBe('sabor');
  });
});
