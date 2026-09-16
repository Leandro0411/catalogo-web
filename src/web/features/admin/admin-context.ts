import { createContext, useContext } from 'react';
import type { AdminMeResponse } from '../../../shared/types/api.types';

export interface AdminContextValue {
  me: AdminMeResponse;
  refresh: () => void;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);

  if (!value) {
    throw new Error('useAdmin debe usarse dentro de AdminLayout');
  }

  return value;
}
