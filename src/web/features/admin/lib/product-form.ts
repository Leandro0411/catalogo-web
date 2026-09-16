import { validateAttributes } from '../../../../shared/domain/attributes';
import { parseMoneyInput } from '../../../../shared/domain/money';
import { productInputSchema } from '../../../../shared/schemas/product.schema';
import type { AdminCategory, AdminProduct, ProductInput } from '../../../../shared/types/api.types';
import type { Choice, ProductStatus, StockMode } from '../../../../shared/types/catalog.types';
import type { Currency } from '../../../../shared/types/tenant.types';

export interface ProductFormState {
  categoryId: string;
  name: string;
  priceText: string;
  currency: Currency;
  priceNote: string;
  attributes: Record<string, string>;
  choices: Choice[];
  description: string;
  status: ProductStatus;
  stockMode: StockMode;
  stockQty: string;
}

export interface ProductFormErrors {
  price?: string;
  stockQty?: string;
  attributes?: Record<string, string>;
  choices?: string;
  general?: string;
}

export type ToProductInputResult = { input: ProductInput } | { errors: ProductFormErrors };

const CENTS_PER_UNIT = 100;

function centsToInputText(cents: number): string {
  const hasDecimals = cents % CENTS_PER_UNIT !== 0;
  const units = cents / CENTS_PER_UNIT;
  return hasDecimals ? units.toFixed(2).replace('.', ',') : String(units);
}

export function emptyFormState(
  category: AdminCategory,
  tenantCurrency: Currency,
): ProductFormState {
  return {
    categoryId: category.id,
    name: '',
    priceText: '',
    currency: category.defaultCurrency ?? tenantCurrency,
    priceNote: '',
    attributes: {},
    choices: [],
    description: '',
    status: 'active',
    stockMode: category.defaultStockMode,
    stockQty: '',
  };
}

export function formStateFromProduct(product: AdminProduct): ProductFormState {
  const attributes: Record<string, string> = {};

  for (const [key, value] of Object.entries(product.attributes)) {
    attributes[key] = String(value);
  }

  return {
    categoryId: product.categoryId,
    name: product.name,
    priceText: centsToInputText(product.priceCents),
    currency: product.currency,
    priceNote: product.priceNote ?? '',
    attributes,
    choices: product.choices,
    description: product.description ?? '',
    status: product.status,
    stockMode: product.stockMode,
    stockQty: product.stockQty !== null ? String(product.stockQty) : '',
  };
}

export function toProductInput(
  state: ProductFormState,
  category: AdminCategory,
): ToProductInputResult {
  const priceCents = parseMoneyInput(state.priceText);

  if (priceCents === null) {
    return { errors: { price: 'Precio inválido' } };
  }

  const attributesResult = validateAttributes(category.attributeSchema, state.attributes);

  if (!attributesResult.ok) {
    return { errors: { attributes: attributesResult.errors } };
  }

  let stockQty: number | null = null;

  if (state.stockMode === 'quantity') {
    stockQty = Number(state.stockQty);

    if (!Number.isFinite(stockQty) || stockQty < 0) {
      return { errors: { stockQty: 'Cantidad inválida' } };
    }
  }

  const candidate = {
    categoryId: state.categoryId,
    name: state.name,
    description: state.description.trim() === '' ? null : state.description,
    imageKey: null,
    priceCents,
    currency: state.currency,
    priceNote: state.priceNote.trim() === '' ? null : state.priceNote,
    stockMode: state.stockMode,
    stockQty,
    status: state.status,
    attributes: attributesResult.value,
    choices: state.choices,
  };

  const parsed = productInputSchema.safeParse(candidate);

  if (!parsed.success) {
    return { errors: { general: 'Revisá los datos del formulario' } };
  }

  return { input: parsed.data };
}
