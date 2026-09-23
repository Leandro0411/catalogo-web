import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  filtersFromSearchParams,
  filtersToSearchParams,
  pruneFiltersForCategory,
} from '../../../../shared/domain/filters';
import type { PublicCategory } from '../../../../shared/types/api.types';
import type { CatalogFilters } from '../../../../shared/types/filters.types';
import type { Currency } from '../../../../shared/types/tenant.types';

export interface UseFiltersResult {
  filters: CatalogFilters;
  setCategory: (category: string | null, categories: PublicCategory[]) => void;
  setQuery: (q: string) => void;
  toggleMulti: (key: string, value: string) => void;
  setMin: (key: string, value: number | null) => void;
  setPriceMax: (value: { currency: Currency; amountCents: number } | null) => void;
  clear: () => void;
}

const EMPTY_FILTERS: CatalogFilters = { category: null, q: '', multi: {}, min: {}, priceMax: null };

export function useFilters(): UseFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);

  const apply = useCallback(
    (next: CatalogFilters) => {
      setSearchParams(filtersToSearchParams(next), { replace: true });
    },
    [setSearchParams],
  );

  const setCategory = useCallback(
    (category: string | null, categories: PublicCategory[]) => {
      apply(pruneFiltersForCategory(filters, category, categories));
    },
    [apply, filters],
  );

  const setQuery = useCallback((q: string) => apply({ ...filters, q }), [apply, filters]);

  const toggleMulti = useCallback(
    (key: string, value: string) => {
      const current = filters.multi[key] ?? [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      apply({ ...filters, multi: { ...filters.multi, [key]: next } });
    },
    [apply, filters],
  );

  const setMin = useCallback(
    (key: string, value: number | null) => {
      const min = { ...filters.min };

      if (value === null) {
        delete min[key];
      } else {
        min[key] = value;
      }

      apply({ ...filters, min });
    },
    [apply, filters],
  );

  const setPriceMax = useCallback(
    (value: { currency: Currency; amountCents: number } | null) => apply({ ...filters, priceMax: value }),
    [apply, filters],
  );

  const clear = useCallback(() => apply(EMPTY_FILTERS), [apply]);

  return { filters, setCategory, setQuery, toggleMulti, setMin, setPriceMax, clear };
}
