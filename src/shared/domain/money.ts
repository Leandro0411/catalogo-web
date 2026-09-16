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

const MAX_MONEY_INPUT_DECIMALS = 2;
const THOUSANDS_GROUP_LENGTH = 3;
const MONEY_INPUT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function parseMoneyInput(text: string): number | null {
  const trimmed = text.trim();

  if (trimmed === '') {
    return null;
  }

  let normalized = trimmed;

  if (normalized.includes(',')) {
    const [integerPart, decimalPart] = normalized.split(',');

    if (!integerPart || !decimalPart || decimalPart.length > MAX_MONEY_INPUT_DECIMALS) {
      return null;
    }

    normalized = `${integerPart.replace(/\./g, '')}.${decimalPart}`;
  } else {
    const dotCount = (normalized.match(/\./g) ?? []).length;

    if (dotCount > 1) {
      normalized = normalized.replace(/\./g, '');
    } else if (dotCount === 1) {
      const decimalPart = normalized.split('.')[1] ?? '';

      if (decimalPart.length === THOUSANDS_GROUP_LENGTH) {
        normalized = normalized.replace(/\./g, '');
      }
    }
  }

  if (!MONEY_INPUT_PATTERN.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * CENTS_PER_UNIT);
}
