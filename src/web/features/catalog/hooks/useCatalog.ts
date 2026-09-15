import { useCallback, useEffect, useState } from 'react';
import { getCatalog } from '../../../api/public.api';
import { HttpError } from '../../../api/http';
import type { PublicCatalogResponse } from '../../../../shared/types/api.types';

export type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; data: PublicCatalogResponse }
  | { status: 'not-found' }
  | { status: 'error' };

type SlugState = CatalogState & { slug: string };

export function useCatalog(slug: string): CatalogState & { reload: () => void } {
  const [state, setState] = useState<SlugState>({ slug, status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getCatalog(slug, controller.signal)
      .then((data) => {
        setState({ slug, status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (error instanceof HttpError && error.status === 404) {
          setState({ slug, status: 'not-found' });
          return;
        }
        setState({ slug, status: 'error' });
      });

    return () => controller.abort();
  }, [slug, reloadToken]);

  const reload = useCallback(() => {
    setState((previous) => ({ slug: previous.slug, status: 'loading' }));
    setReloadToken((token) => token + 1);
  }, []);

  const current: CatalogState = state.slug === slug ? state : { status: 'loading' };

  return { ...current, reload };
}
