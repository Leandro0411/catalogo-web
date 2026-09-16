import { z } from 'zod';
import { CURRENCIES, RESERVED_SLUGS } from '../constants';
import { categoryConfigSchema } from './catalog.schema';

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])$/, 'Formato de slug inválido')
  .refine((slug) => !(RESERVED_SLUGS as readonly string[]).includes(slug), {
    message: 'Slug reservado',
  });

export const tenantConfigSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(60),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
  whatsapp: z.string().regex(/^\d{10,15}$/, 'WhatsApp inválido'),
  currency: z.enum(CURRENCIES),
  ageGate: z.boolean(),
  noindex: z.boolean(),
  isActive: z.boolean().default(true),
  categories: z.array(categoryConfigSchema).default([]),
});
