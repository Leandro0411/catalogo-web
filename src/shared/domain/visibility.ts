import type { Choice, HiddenReason, ProductStatus, StockMode } from '../types/catalog.types';

interface VisibilityProduct {
  status: ProductStatus;
  stockMode: StockMode;
  stockQty: number | null;
  choices: Choice[];
}

interface VisibilityCategory {
  choiceLabel: string | null;
}

export function getHiddenReason(
  product: VisibilityProduct,
  category: VisibilityCategory,
): HiddenReason | null {
  if (product.status === 'paused') {
    return 'PAUSED';
  }

  if (product.status === 'sold') {
    return 'SOLD';
  }

  if (product.stockMode === 'quantity' && (product.stockQty ?? 0) <= 0) {
    return 'OUT_OF_STOCK';
  }

  if (category.choiceLabel !== null && !product.choices.some((choice) => choice.available)) {
    return 'NO_CHOICES_AVAILABLE';
  }

  return null;
}

export function isPubliclyVisible(
  product: VisibilityProduct,
  category: VisibilityCategory,
): boolean {
  return getHiddenReason(product, category) === null;
}
