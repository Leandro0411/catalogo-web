import type { z } from 'zod';
import type {
  ATTRIBUTE_FILTERS,
  ATTRIBUTE_TYPES,
  PRODUCT_STATUSES,
  STOCK_MODES,
} from '../constants';
import type {
  attributeDefSchema,
  categoryConfigSchema,
  choiceSchema,
} from '../schemas/catalog.schema';

export type StockMode = (typeof STOCK_MODES)[number];

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export type AttributeFilter = (typeof ATTRIBUTE_FILTERS)[number];

export type AttributeDef = z.infer<typeof attributeDefSchema>;

export type Choice = z.infer<typeof choiceSchema>;

export type CategoryConfig = z.infer<typeof categoryConfigSchema>;

export type HiddenReason = 'PAUSED' | 'SOLD' | 'OUT_OF_STOCK' | 'NO_CHOICES_AVAILABLE';
