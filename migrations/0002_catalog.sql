CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  attribute_schema TEXT NOT NULL DEFAULT '[]',
  choice_label TEXT,
  default_stock_mode TEXT NOT NULL DEFAULT 'availability' CHECK (default_stock_mode IN ('availability','unit','quantity')),
  default_currency TEXT CHECK (default_currency IS NULL OR default_currency IN ('ARS','USD')),
  UNIQUE (tenant_id, key)
);
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  image_key TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL CHECK (currency IN ('ARS','USD')),
  price_note TEXT,
  stock_mode TEXT NOT NULL CHECK (stock_mode IN ('availability','unit','quantity')),
  stock_qty INTEGER CHECK (stock_qty IS NULL OR stock_qty >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','sold')),
  attributes TEXT NOT NULL DEFAULT '{}',
  choices TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_categories_tenant ON categories(tenant_id, sort_order);
CREATE INDEX idx_products_tenant_status ON products(tenant_id, status);
CREATE INDEX idx_products_category ON products(category_id);
