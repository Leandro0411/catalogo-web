import { useCallback, useEffect, useState } from 'react';
import * as adminApi from '../../../api/admin.api';
import type { AdminCategory, AdminProduct } from '../../../../shared/types/api.types';

type AdminProductsState =
  | { status: 'loading' }
  | { status: 'ready'; categories: AdminCategory[]; products: AdminProduct[] }
  | { status: 'error' };

export interface UseAdminProductsResult {
  state: AdminProductsState;
  toggleStatus: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => void;
}

export function useAdminProducts(): UseAdminProductsResult {
  const [state, setState] = useState<AdminProductsState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([adminApi.listCategories(), adminApi.listProducts()])
      .then(([categories, products]) => {
        if (!cancelled) {
          setState({ status: 'ready', categories, products });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const toggleStatus = useCallback(
    async (id: string) => {
      if (state.status !== 'ready') {
        return;
      }

      const current = state.products.find((product) => product.id === id);

      if (!current) {
        return;
      }

      const nextStatus = current.status === 'active' ? 'paused' : 'active';
      const previousProducts = state.products;

      setState({
        ...state,
        products: state.products.map((product) =>
          product.id === id ? { ...product, status: nextStatus } : product,
        ),
      });

      try {
        const updated = await adminApi.setProductStatus(id, nextStatus);
        setState((prev) =>
          prev.status === 'ready'
            ? {
                ...prev,
                products: prev.products.map((product) => (product.id === id ? updated : product)),
              }
            : prev,
        );
      } catch {
        setState((prev) =>
          prev.status === 'ready' ? { ...prev, products: previousProducts } : prev,
        );
      }
    },
    [state],
  );

  const remove = useCallback(async (id: string) => {
    await adminApi.deleteProduct(id);
    setState((prev) =>
      prev.status === 'ready'
        ? { ...prev, products: prev.products.filter((product) => product.id !== id) }
        : prev,
    );
  }, []);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { state, toggleStatus, remove, reload };
}
