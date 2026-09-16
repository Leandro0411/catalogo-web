import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';

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
