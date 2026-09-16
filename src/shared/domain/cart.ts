import { CURRENCIES, MAX_CART_LINES, MAX_QTY_PER_LINE } from '../constants';
import type { PublicCatalogResponse, PublicProduct } from '../types/api.types';
import type { AddLineOutcome, CartItem, CartLine, CartSummary } from '../types/cart.types';
import type { Currency } from '../types/tenant.types';

export function maxQtyFor(product: PublicProduct): number {
  switch (product.stockMode) {
    case 'unit':
      return 1;
    case 'quantity':
      return product.stockQty ?? 0;
    case 'availability':
      return MAX_QTY_PER_LINE;
  }
}

function sameLine(line: CartLine, productId: string, choice: string | null): boolean {
  return line.productId === productId && line.choice === choice;
}

export function addLine(
  lines: CartLine[],
  input: CartLine,
  product: PublicProduct,
): AddLineOutcome {
  const max = maxQtyFor(product);
  const existingIndex = lines.findIndex((line) => sameLine(line, input.productId, input.choice));

  if (existingIndex === -1 && lines.length >= MAX_CART_LINES) {
    return { lines, result: 'cart-full' };
  }

  if (existingIndex !== -1) {
    const existing = lines[existingIndex];
    const requestedQty = existing.qty + input.qty;
    const clampedQty = Math.min(requestedQty, max);
    const updated = [...lines];
    updated[existingIndex] = { ...existing, qty: clampedQty };
    return { lines: updated, result: clampedQty < requestedQty ? 'clamped' : 'added' };
  }

  const clampedQty = Math.min(input.qty, max);
  return {
    lines: [...lines, { ...input, qty: clampedQty }],
    result: clampedQty < input.qty ? 'clamped' : 'added',
  };
}

export function updateLineQty(
  lines: CartLine[],
  productId: string,
  choice: string | null,
  qty: number,
): CartLine[] {
  return lines.map((line) => (sameLine(line, productId, choice) ? { ...line, qty } : line));
}

export function removeLine(
  lines: CartLine[],
  productId: string,
  choice: string | null,
): CartLine[] {
  return lines.filter((line) => !sameLine(line, productId, choice));
}

export function reconcileCart(lines: CartLine[], catalog: PublicCatalogResponse): CartSummary {
  const productById = new Map(catalog.products.map((product) => [product.id, product]));
  const categoryByKey = new Map(catalog.categories.map((category) => [category.key, category]));

  const items: CartItem[] = lines.map((line) => {
    const product = productById.get(line.productId) ?? null;

    if (!product) {
      return {
        line,
        product: null,
        unitPriceCents: 0,
        currency: CURRENCIES[0] as Currency,
        subtotalCents: 0,
        issue: 'UNAVAILABLE',
        valid: false,
      };
    }

    const category = categoryByKey.get(product.categoryKey);
    const choiceUnavailable =
      category?.choiceLabel != null &&
      (line.choice === null || !product.choices.includes(line.choice));

    if (choiceUnavailable) {
      return {
        line,
        product,
        unitPriceCents: product.priceCents,
        currency: product.currency,
        subtotalCents: 0,
        issue: 'CHOICE_UNAVAILABLE',
        valid: false,
      };
    }

    const max = maxQtyFor(product);

    if (max === 0) {
      return {
        line,
        product,
        unitPriceCents: product.priceCents,
        currency: product.currency,
        subtotalCents: 0,
        issue: 'UNAVAILABLE',
        valid: false,
      };
    }

    const qty = Math.min(line.qty, max);
    const adjusted = qty !== line.qty;

    return {
      line: adjusted ? { ...line, qty } : line,
      product,
      unitPriceCents: product.priceCents,
      currency: product.currency,
      subtotalCents: product.priceCents * qty,
      issue: adjusted ? 'QTY_ADJUSTED' : null,
      valid: true,
    };
  });

  const validItems = items.filter((item) => item.valid);
  const totals: Partial<Record<Currency, number>> = {};

  for (const item of validItems) {
    totals[item.currency] = (totals[item.currency] ?? 0) + item.subtotalCents;
  }

  return {
    items,
    validItems,
    totals,
    hasIssues: items.some((item) => item.issue !== null),
  };
}
