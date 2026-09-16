import type { PublicProduct } from './api.types';
import type { Currency } from './tenant.types';

export interface CartLine {
  productId: string;
  choice: string | null;
  qty: number;
}

export type CartIssue = 'UNAVAILABLE' | 'CHOICE_UNAVAILABLE' | 'QTY_ADJUSTED';

export interface CartItem {
  line: CartLine;
  product: PublicProduct | null;
  unitPriceCents: number;
  currency: Currency;
  subtotalCents: number;
  issue: CartIssue | null;
  valid: boolean;
}

export interface CartSummary {
  items: CartItem[];
  validItems: CartItem[];
  totals: Partial<Record<Currency, number>>;
  hasIssues: boolean;
}

export type AddLineResult = 'added' | 'clamped' | 'cart-full';

export interface AddLineOutcome {
  lines: CartLine[];
  result: AddLineResult;
}
