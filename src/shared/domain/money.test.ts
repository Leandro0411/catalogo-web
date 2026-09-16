import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoneyInput } from './money';

describe('formatMoney', () => {
  it('formatea pesos sin decimales con separador de miles', () => {
    expect(formatMoney(2600000, 'ARS')).toBe('$26.000');
  });

  it('formatea dólares sin decimales', () => {
    expect(formatMoney(73500, 'USD')).toBe('USD 735');
  });

  it('muestra decimales solo cuando los centavos no son un múltiplo de 100', () => {
    expect(formatMoney(1050, 'ARS')).toBe('$10,50');
  });
});

describe('parseMoneyInput', () => {
  it.each([
    ['26000', 2600000],
    ['26.000', 2600000],
    ['26.000,50', 2600050],
    ['735', 73500],
    ['735,5', 73550],
    ['735.5', 73550],
  ])('convierte "%s" a %i centavos', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it('devuelve null para un valor inválido', () => {
    expect(parseMoneyInput('no es un número')).toBeNull();
  });

  it('devuelve null para un valor negativo', () => {
    expect(parseMoneyInput('-100')).toBeNull();
  });

  it('devuelve null para más de dos decimales', () => {
    expect(parseMoneyInput('26,505')).toBeNull();
  });
});
