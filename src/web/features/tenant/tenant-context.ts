import { createContext, useContext } from 'react';
import type { PublicCatalogResponse } from '../../../shared/types/api.types';

export interface TenantContextValue {
  catalog: PublicCatalogResponse;
  reload: () => void;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const value = useContext(TenantContext);

  if (!value) {
    throw new Error('useTenant debe usarse dentro de TenantLayout');
  }

  return value;
}
