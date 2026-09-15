import type { z } from 'zod';
import type { CURRENCIES } from '../constants';
import type { tenantConfigSchema } from '../schemas/tenant.schema';

export type Currency = (typeof CURRENCIES)[number];

export type TenantConfig = z.infer<typeof tenantConfigSchema>;
