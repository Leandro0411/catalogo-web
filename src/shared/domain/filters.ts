import { CURRENCIES } from '../constants';
import type { PublicCategory, PublicProduct } from '../types/api.types';
import type { CatalogFilters, FilterControl } from '../types/filters.types';
import type { Currency } from '../types/tenant.types';

const DIACRITICS_PATTERN = /[̀-ͯ]/g;

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function categoriesInScope(categories: PublicCategory[], category: string | null): PublicCategory[] {
  return category === null
    ? [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
    : categories.filter((item) => item.key === category);
}

function productsInScope(products: PublicProduct[], categories: PublicCategory[]): PublicProduct[] {
  const keys = new Set(categories.map((category) => category.key));
  return products.filter((product) => keys.has(product.categoryKey));
}

function sortMultiOptions(values: Set<string>, options: string[] | undefined): string[] {
  if (options) {
    return options.filter((option) => values.has(option));
  }

  return [...values].sort((a, b) => a.localeCompare(b, 'es'));
}

export function buildFilterControls(
  catalog: { categories: PublicCategory[]; products: PublicProduct[] },
  category: string | null,
): FilterControl[] {
  const scopeCategories = categoriesInScope(catalog.categories, category);
  const scopeProducts = productsInScope(catalog.products, scopeCategories);
  const controls: FilterControl[] = [];
  const seenKeys = new Set<string>();

  for (const scopeCategory of scopeCategories) {
    for (const def of scopeCategory.attributeSchema) {
      if (!def.filter || seenKeys.has(def.key)) {
        continue;
      }

      seenKeys.add(def.key);

      if (def.filter === 'multi') {
        const values = new Set<string>();

        for (const product of scopeProducts) {
          const value = product.attributes[def.key];
          if (typeof value === 'string') {
            values.add(value);
          }
        }

        const options = sortMultiOptions(values, def.type === 'enum' ? def.options : undefined);

        if (options.length > 0) {
          controls.push({ kind: 'multi', key: def.key, label: def.label, options });
        }
      }

      if (def.filter === 'min') {
        let min: number | null = null;
        let max: number | null = null;

        for (const product of scopeProducts) {
          const value = product.attributes[def.key];
          if (typeof value === 'number') {
            min = min === null ? value : Math.min(min, value);
            max = max === null ? value : Math.max(max, value);
          }
        }

        if (min !== null && max !== null) {
          controls.push({ kind: 'min', key: def.key, label: def.label, unit: def.unit, range: [min, max] });
        }
      }
    }
  }

  const tenantCurrencies = new Set<Currency>(catalog.products.map((product) => product.currency));
  const scopeCurrencies = new Set<Currency>(scopeProducts.map((product) => product.currency));

  if (tenantCurrencies.size >= 2) {
    controls.push({
      kind: 'price',
      currencies: CURRENCIES.filter((currency) => scopeCurrencies.has(currency)),
    });
  }

  return controls;
}

function matchesQuery(product: PublicProduct, category: PublicCategory | undefined, words: string[]): boolean {
  if (words.length === 0) {
    return true;
  }

  const haystack = normalizeText(
    [
      product.name,
      category?.name ?? '',
      ...Object.values(product.attributes).map(String),
      ...product.choices,
    ].join(' '),
  );

  return words.every((word) => haystack.includes(word));
}

export function applyFilters(
  products: PublicProduct[],
  categories: PublicCategory[],
  filters: CatalogFilters,
): PublicProduct[] {
  const categoryByKey = new Map(categories.map((category) => [category.key, category]));
  const words = normalizeText(filters.q)
    .split(' ')
    .filter((word) => word.length > 0);
  const multiEntries = Object.entries(filters.multi).filter(([, values]) => values.length > 0);
  const minEntries = Object.entries(filters.min);

  return products.filter((product) => {
    if (filters.category !== null && product.categoryKey !== filters.category) {
      return false;
    }

    if (!matchesQuery(product, categoryByKey.get(product.categoryKey), words)) {
      return false;
    }

    for (const [key, values] of multiEntries) {
      const value = product.attributes[key];
      if (typeof value !== 'string' || !values.includes(value)) {
        return false;
      }
    }

    for (const [key, minValue] of minEntries) {
      const value = product.attributes[key];
      if (typeof value !== 'number' || value < minValue) {
        return false;
      }
    }

    if (filters.priceMax) {
      if (
        product.currency !== filters.priceMax.currency ||
        product.priceCents > filters.priceMax.amountCents
      ) {
        return false;
      }
    }

    return true;
  });
}

const MULTI_PARAM_PREFIX = 'f_';
const MIN_PARAM_PREFIX = 'min_';
const CENTS_PER_UNIT = 100;

export function filtersFromSearchParams(searchParams: URLSearchParams): CatalogFilters {
  const filters: CatalogFilters = {
    category: searchParams.get('cat'),
    q: searchParams.get('q') ?? '',
    multi: {},
    min: {},
    priceMax: null,
  };

  for (const [param, raw] of searchParams) {
    if (param.startsWith(MULTI_PARAM_PREFIX)) {
      const key = param.slice(MULTI_PARAM_PREFIX.length);
      const values = raw
        .split(',')
        .map((value) => decodeURIComponent(value))
        .filter((value) => value.length > 0);

      if (values.length > 0) {
        filters.multi[key] = values;
      }
      continue;
    }

    if (param.startsWith(MIN_PARAM_PREFIX)) {
      const key = param.slice(MIN_PARAM_PREFIX.length);
      const value = Number(raw);

      if (Number.isFinite(value)) {
        filters.min[key] = value;
      }
    }
  }

  const pmax = searchParams.get('pmax');
  const pcur = searchParams.get('pcur');

  if (pmax !== null && pcur !== null && (CURRENCIES as readonly string[]).includes(pcur)) {
    const amount = Number(pmax);

    if (Number.isFinite(amount) && amount >= 0) {
      filters.priceMax = { currency: pcur as Currency, amountCents: Math.round(amount * CENTS_PER_UNIT) };
    }
  }

  return filters;
}

export function filtersToSearchParams(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.category !== null) {
    params.set('cat', filters.category);
  }

  if (filters.q !== '') {
    params.set('q', filters.q);
  }

  for (const [key, values] of Object.entries(filters.multi)) {
    if (values.length > 0) {
      params.set(`${MULTI_PARAM_PREFIX}${key}`, values.map(encodeURIComponent).join(','));
    }
  }

  for (const [key, value] of Object.entries(filters.min)) {
    params.set(`${MIN_PARAM_PREFIX}${key}`, String(value));
  }

  if (filters.priceMax) {
    params.set('pmax', String(filters.priceMax.amountCents / CENTS_PER_UNIT));
    params.set('pcur', filters.priceMax.currency);
  }

  return params;
}

export function countActiveFilters(filters: CatalogFilters): number {
  const activeMulti = Object.values(filters.multi).filter((values) => values.length > 0).length;
  const activeMin = Object.keys(filters.min).length;
  const activePrice = filters.priceMax ? 1 : 0;

  return activeMulti + activeMin + activePrice;
}

export function pruneFiltersForCategory(
  filters: CatalogFilters,
  category: string | null,
  categories: PublicCategory[],
): CatalogFilters {
  if (category === null) {
    return { ...filters, category: null };
  }

  const target = categories.find((item) => item.key === category);
  const allowedKeys = new Set((target?.attributeSchema ?? []).filter((def) => def.filter).map((def) => def.key));

  const multi: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(filters.multi)) {
    if (allowedKeys.has(key)) {
      multi[key] = values;
    }
  }

  const min: Record<string, number> = {};
  for (const [key, value] of Object.entries(filters.min)) {
    if (allowedKeys.has(key)) {
      min[key] = value;
    }
  }

  return { ...filters, category, multi, min };
}
