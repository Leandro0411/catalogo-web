export interface TenantRow {
  id: string;
  slug: string;
  name: string;
  logo_key: string | null;
  primary_color: string;
  whatsapp: string;
  currency: string;
  age_gate: number;
  noindex: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  tenant_id: string;
  key: string;
  name: string;
  sort_order: number;
  attribute_schema: string;
  choice_label: string | null;
  default_stock_mode: string;
  default_currency: string | null;
}

export interface ProductRow {
  id: string;
  tenant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_key: string | null;
  price_cents: number;
  currency: string;
  price_note: string | null;
  stock_mode: string;
  stock_qty: number | null;
  status: string;
  attributes: string;
  choices: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
