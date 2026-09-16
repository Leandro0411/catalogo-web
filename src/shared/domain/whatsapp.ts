import { formatMoney } from './money';
import type { CartItem, CartSummary } from '../types/cart.types';
import type { Currency } from '../types/tenant.types';

const REF_LENGTH = 6;
const CURRENCY_TOTAL_LABELS: Record<Currency, string> = {
  ARS: 'Total en pesos',
  USD: 'Total en USD',
};

export function productRef(id: string): string {
  return id.replace(/-/g, '').slice(0, REF_LENGTH).toUpperCase();
}

function formatOrderLine(item: CartItem): string {
  if (!item.product) {
    return '';
  }

  const choicePart = item.line.choice ? ` (${item.line.choice})` : '';
  const refPart = item.product.stockMode === 'unit' ? ` [ref ${productRef(item.product.id)}]` : '';
  const pricePart = formatMoney(item.subtotalCents, item.currency);
  const notePart = item.product.priceNote ? ` — Nota: ${item.product.priceNote}` : '';

  return `• ${item.line.qty} x ${item.product.name}${choicePart}${refPart} — ${pricePart}${notePart}`;
}

function formatTotals(totals: Partial<Record<Currency, number>>): string {
  const currencies = Object.keys(totals) as Currency[];

  if (currencies.length <= 1) {
    const [currency] = currencies;
    return currency ? `Total: ${formatMoney(totals[currency] ?? 0, currency)}` : '';
  }

  return currencies
    .map(
      (currency) =>
        `${CURRENCY_TOTAL_LABELS[currency]}: ${formatMoney(totals[currency] ?? 0, currency)}`,
    )
    .join('\n');
}

export function buildOrderMessage(tenantName: string, summary: CartSummary): string {
  const lines = summary.validItems.map(formatOrderLine).join('\n');
  const totals = formatTotals(summary.totals);

  return `¡Hola ${tenantName}! Quiero hacer este pedido:\n\n${lines}\n\n${totals}`;
}

export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
