import type { Currency } from './tenant.types';

export interface CatalogFilters {
  category: string | null;
  q: string;
  multi: Record<string, string[]>;
  min: Record<string, number>;
  priceMax: { currency: Currency; amountCents: number } | null;
}

export type FilterControl =
  | { kind: 'multi'; key: string; label: string; options: string[] }
  | { kind: 'min'; key: string; label: string; unit: string | undefined; range: [number, number] }
  | { kind: 'price'; currencies: Currency[] };
