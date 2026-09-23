import { z } from 'zod';
import { CURRENCIES, PRODUCT_STATUSES, STOCK_MODES } from '../constants';
import { choiceSchema } from './catalog.schema';

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 500;
const PRICE_NOTE_MAX_LENGTH = 60;
const MAX_PRICE_CENTS = 10 ** 12;
const MAX_CHOICES = 50;
const MAX_SALE_QTY = 999;
const IMAGE_KEY_REGEX = /^t\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/;

export const statusInputSchema = z.object({
  status: z.enum(PRODUCT_STATUSES),
});

export const saleInputSchema = z.object({
  qty: z.number().int().min(1).max(MAX_SALE_QTY),
});

export const productInputSchema = z
  .object({
    categoryId: z.uuid(),
    name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
    description: z.string().max(DESCRIPTION_MAX_LENGTH).nullable(),
    imageKey: z.string().regex(IMAGE_KEY_REGEX, 'Imagen inválida').nullable(),
    priceCents: z.number().int().min(0).max(MAX_PRICE_CENTS),
    currency: z.enum(CURRENCIES),
    priceNote: z.string().max(PRICE_NOTE_MAX_LENGTH).nullable(),
    stockMode: z.enum(STOCK_MODES),
    stockQty: z.number().int().min(0).nullable(),
    status: z.enum(PRODUCT_STATUSES),
    attributes: z.record(z.string(), z.union([z.string(), z.number()])),
    choices: z
      .array(choiceSchema)
      .max(MAX_CHOICES)
      .refine(
        (choices) => {
          const values = choices.map((choice) => choice.value.toLowerCase());
          return new Set(values).size === values.length;
        },
        { message: 'Hay valores repetidos' },
      ),
  })
  .refine(
    (input) => (input.stockMode === 'quantity' ? input.stockQty !== null : input.stockQty === null),
    { message: 'stockQty inválido para el modo de stock', path: ['stockQty'] },
  )
  .refine((input) => input.status !== 'sold' || input.stockMode === 'unit', {
    message: 'El estado "sold" solo aplica a stockMode unit',
    path: ['status'],
  });
