import { z } from 'zod';
import { ATTRIBUTE_FILTERS, ATTRIBUTE_TYPES, CURRENCIES, STOCK_MODES } from '../constants';

const ATTRIBUTE_KEY_REGEX = /^[a-z][a-z0-9_]{0,29}$/;
const ATTRIBUTE_LABEL_MAX_LENGTH = 40;
const CATEGORY_KEY_REGEX = /^[a-z0-9-]{2,30}$/;
const CATEGORY_NAME_MAX_LENGTH = 40;
const CHOICE_LABEL_MAX_LENGTH = 20;
const CHOICE_VALUE_MAX_LENGTH = 80;

export const attributeDefSchema = z
  .object({
    key: z.string().regex(ATTRIBUTE_KEY_REGEX, 'Clave de atributo inválida'),
    label: z.string().min(1).max(ATTRIBUTE_LABEL_MAX_LENGTH),
    type: z.enum(ATTRIBUTE_TYPES),
    unit: z.string().optional(),
    options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
    filter: z.enum(ATTRIBUTE_FILTERS).optional(),
    showInCard: z.boolean().optional(),
  })
  .refine((attr) => attr.type !== 'enum' || (attr.options?.length ?? 0) > 0, {
    message: 'Un atributo enum requiere al menos una opción',
    path: ['options'],
  })
  .refine((attr) => (attr.filter !== 'min' && attr.filter !== 'max') || attr.type === 'number', {
    message: 'El filtro min/max solo aplica a atributos numéricos',
    path: ['filter'],
  })
  .refine((attr) => attr.filter !== 'multi' || attr.type === 'text' || attr.type === 'enum', {
    message: 'El filtro multi solo aplica a atributos de texto o enum',
    path: ['filter'],
  });

export const categoryConfigSchema = z
  .object({
    key: z.string().regex(CATEGORY_KEY_REGEX, 'Clave de categoría inválida'),
    name: z.string().min(1).max(CATEGORY_NAME_MAX_LENGTH),
    sortOrder: z.number().int().default(0),
    attributeSchema: z.array(attributeDefSchema).default([]),
    choiceLabel: z.string().max(CHOICE_LABEL_MAX_LENGTH).nullable().default(null),
    defaultStockMode: z.enum(STOCK_MODES).default('availability'),
    defaultCurrency: z.enum(CURRENCIES).nullable().default(null),
  })
  .refine(
    (category) => {
      const keys = category.attributeSchema.map((attr) => attr.key);
      return new Set(keys).size === keys.length;
    },
    { message: 'Las claves de attributeSchema deben ser únicas', path: ['attributeSchema'] },
  );

export const choiceSchema = z.object({
  value: z.string().trim().min(1).max(CHOICE_VALUE_MAX_LENGTH),
  available: z.boolean(),
});
