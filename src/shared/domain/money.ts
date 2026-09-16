import type { Currency } from '../types/tenant.types';

const CENTS_PER_UNIT = 100;
const CURRENCY_SYMBOLS: Record<Currency, string> = { ARS: '$', USD: 'USD ' };

export function formatMoney(cents: number, currency: Currency): string {
  const hasDecimals = cents % CENTS_PER_UNIT !== 0;
  const units = cents / CENTS_PER_UNIT;

  const formatted = units.toLocaleString('es-AR', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });

  return `${CURRENCY_SYMBOLS[currency]}${formatted}`;
}
