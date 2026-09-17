import type { Currency } from '../../shared/types/tenant.types';

export interface AdminContext {
  adminUserId: string;
  tenantId: string;
  username: string;
  tenantSlug: string;
  tenantName: string;
  primaryColor: string;
  logoUrl: string | null;
  currency: Currency;
}

export interface AppEnv {
  Bindings: Env;
  Variables: {
    admin: AdminContext;
  };
}
