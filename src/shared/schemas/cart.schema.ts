import { z } from 'zod';
import { MAX_CART_LINES, MAX_QTY_PER_LINE } from '../constants';

const cartLineSchema = z.object({
  productId: z.string(),
  choice: z.string().nullable(),
  qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
});

export const cartStorageSchema = z.object({
  lines: z.array(cartLineSchema).max(MAX_CART_LINES),
});
