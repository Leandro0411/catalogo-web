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
