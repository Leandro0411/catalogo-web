import type { z } from 'zod';
import type { AttributeDef, Choice, HiddenReason, ProductStatus, StockMode } from './catalog.types';
import type { Currency } from './tenant.types';
import type { productInputSchema } from '../schemas/product.schema';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PublicTenant {
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  whatsapp: string;
  currency: Currency;
  ageGate: boolean;
}

export interface PublicCategory {
  key: string;
  name: string;
  sortOrder: number;
  attributeSchema: AttributeDef[];
  choiceLabel: string | null;
}

export interface PublicProduct {
  id: string;
  categoryKey: string;
  name: string;
  description: string | null;
  image: { thumb: string; full: string } | null;
  priceCents: number;
  currency: Currency;
  priceNote: string | null;
  stockMode: StockMode;
  stockQty: number | null;
  attributes: Record<string, string | number>;
  choices: string[];
}

export interface PublicCatalogResponse {
  tenant: PublicTenant;
  categories: PublicCategory[];
  products: PublicProduct[];
}

export interface AdminMeResponse {
  username: string;
  tenant: {
    slug: string;
    name: string;
    primaryColor: string;
    currency: Currency;
  };
}

export interface AdminCategory {
  id: string;
  key: string;
  name: string;
  sortOrder: number;
  attributeSchema: AttributeDef[];
  choiceLabel: string | null;
  defaultStockMode: StockMode;
  defaultCurrency: Currency | null;
}

export interface AdminProduct {
  id: string;
  categoryId: string;
  categoryKey: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  priceCents: number;
  currency: Currency;
  priceNote: string | null;
  stockMode: StockMode;
  stockQty: number | null;
  status: ProductStatus;
  attributes: Record<string, string | number>;
  choices: Choice[];
  hiddenReason: HiddenReason | null;
  updatedAt: string;
}

export type ProductInput = z.infer<typeof productInputSchema>;
