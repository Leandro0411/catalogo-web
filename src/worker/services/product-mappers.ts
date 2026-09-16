import { z } from 'zod';
import { attributeDefSchema, choiceSchema } from '../../shared/schemas/catalog.schema';
import { getHiddenReason } from '../../shared/domain/visibility';
import { parseJsonColumn } from '../lib/json';
import type { CategoryRow, ProductRow } from '../repositories/row.types';
import type {
  AdminCategory,
  AdminProduct,
  PublicCategory,
  PublicProduct,
} from '../../shared/types/api.types';
import type { Choice, ProductStatus, StockMode } from '../../shared/types/catalog.types';
import type { Currency } from '../../shared/types/tenant.types';

const attributeSchemaArraySchema = z.array(attributeDefSchema);
const choicesArraySchema = z.array(choiceSchema);
const attributesRecordSchema = z.record(z.string(), z.union([z.string(), z.number()]));

export interface ParsedCategoryRow {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  sortOrder: number;
  attributeSchema: AdminCategory['attributeSchema'];
  choiceLabel: string | null;
  defaultStockMode: StockMode;
  defaultCurrency: Currency | null;
}

export interface ParsedProductRow {
  id: string;
  tenantId: string;
  categoryId: string;
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
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function parseCategoryRow(row: CategoryRow): ParsedCategoryRow {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    key: row.key,
    name: row.name,
    sortOrder: row.sort_order,
    attributeSchema: parseJsonColumn(row.attribute_schema, attributeSchemaArraySchema, []),
    choiceLabel: row.choice_label,
    defaultStockMode: row.default_stock_mode as StockMode,
    defaultCurrency: row.default_currency as Currency | null,
  };
}

export function parseProductRow(row: ProductRow): ParsedProductRow {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    imageKey: row.image_key,
    priceCents: row.price_cents,
    currency: row.currency as Currency,
    priceNote: row.price_note,
    stockMode: row.stock_mode as StockMode,
    stockQty: row.stock_qty,
    status: row.status as ProductStatus,
    attributes: parseJsonColumn(row.attributes, attributesRecordSchema, {}),
    choices: parseJsonColumn(row.choices, choicesArraySchema, []),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicCategory(category: ParsedCategoryRow): PublicCategory {
  return {
    key: category.key,
    name: category.name,
    sortOrder: category.sortOrder,
    attributeSchema: category.attributeSchema,
    choiceLabel: category.choiceLabel,
  };
}

export function toAdminCategory(category: ParsedCategoryRow): AdminCategory {
  return {
    id: category.id,
    key: category.key,
    name: category.name,
    sortOrder: category.sortOrder,
    attributeSchema: category.attributeSchema,
    choiceLabel: category.choiceLabel,
    defaultStockMode: category.defaultStockMode,
    defaultCurrency: category.defaultCurrency,
  };
}

export function toPublicProduct(product: ParsedProductRow, categoryKey: string): PublicProduct {
  return {
    id: product.id,
    categoryKey,
    name: product.name,
    description: product.description,
    image: product.imageKey
      ? { thumb: `/img/${product.imageKey}-480`, full: `/img/${product.imageKey}-1200` }
      : null,
    priceCents: product.priceCents,
    currency: product.currency,
    priceNote: product.priceNote,
    stockMode: product.stockMode,
    stockQty: product.stockQty,
    attributes: product.attributes,
    choices: product.choices.filter((choice) => choice.available).map((choice) => choice.value),
  };
}

export function toAdminProduct(
  product: ParsedProductRow,
  category: ParsedCategoryRow,
): AdminProduct {
  return {
    id: product.id,
    categoryId: product.categoryId,
    categoryKey: category.key,
    name: product.name,
    description: product.description,
    imageKey: product.imageKey,
    priceCents: product.priceCents,
    currency: product.currency,
    priceNote: product.priceNote,
    stockMode: product.stockMode,
    stockQty: product.stockQty,
    status: product.status,
    attributes: product.attributes,
    choices: product.choices,
    hiddenReason: getHiddenReason(
      {
        status: product.status,
        stockMode: product.stockMode,
        stockQty: product.stockQty,
        choices: product.choices,
      },
      { choiceLabel: category.choiceLabel },
    ),
    updatedAt: product.updatedAt,
  };
}
