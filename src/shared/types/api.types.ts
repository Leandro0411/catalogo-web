import type { AttributeDef, StockMode } from './catalog.types';
import type { Currency } from './tenant.types';

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
