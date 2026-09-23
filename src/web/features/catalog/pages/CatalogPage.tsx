import { useMemo } from 'react';
import { useParams } from 'react-router';
import { useTenant } from '../../tenant/tenant-context';
import { ProductCard } from '../components/ProductCard';
import { CategoryChips } from '../components/CategoryChips';
import { CategorySection } from '../components/CategorySection';
import { SearchBox } from '../components/SearchBox';
import { FilterPanel } from '../components/FilterPanel';
import { useFilters } from '../hooks/useFilters';
import { applyFilters, buildFilterControls, countActiveFilters } from '../../../../shared/domain/filters';
import { CartBar } from '../../cart/components/CartBar';
import { EmptyState } from '../../../shared/components/EmptyState';
import type { PublicProduct } from '../../../../shared/types/api.types';

const SEARCHBOX_MIN_PRODUCTS = 6;

function resultCountLabel(count: number): string {
  return `${count} producto${count === 1 ? '' : 's'}`;
}

export function CatalogPage() {
  const { slug } = useParams<{ slug: string }>();
  const { catalog } = useTenant();
  const { filters, setCategory, setQuery, toggleMulti, setMin, setPriceMax, clear } = useFilters();

  const controls = useMemo(
    () => buildFilterControls(catalog, filters.category),
    [catalog, filters.category],
  );
  const filteredProducts = useMemo(
    () => applyFilters(catalog.products, catalog.categories, filters),
    [catalog, filters],
  );

  if (catalog.products.length === 0) {
    return <EmptyState message="Todavía no hay productos disponibles" />;
  }

  const categoriesByKey = new Map(catalog.categories.map((category) => [category.key, category]));
  const layoutCategories = [...catalog.categories]
    .filter((category) => catalog.products.some((product) => product.categoryKey === category.key))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const isSectioned = layoutCategories.length > 1;

  const showSearch = catalog.products.length >= SEARCHBOX_MIN_PRODUCTS;
  const showFilters = controls.length > 0;
  const hasToolbar = showSearch || showFilters;
  const hasActiveFilters = countActiveFilters(filters) > 0 || filters.q !== '';

  const toolbar = hasToolbar ? (
    <div className="flex gap-2 px-4 pt-4">
      {showSearch ? <SearchBox value={filters.q} onChange={setQuery} /> : null}
      {showFilters ? (
        <FilterPanel
          controls={controls}
          filters={filters}
          resultCount={filteredProducts.length}
          tenantCurrency={catalog.tenant.currency}
          onToggleMulti={toggleMulti}
          onSetMin={setMin}
          onSetPriceMax={setPriceMax}
          onClear={clear}
        />
      ) : null}
    </div>
  ) : null;

  const countLabel = hasToolbar ? (
    <p className="px-4 pt-2 text-sm text-gray-500">{resultCountLabel(filteredProducts.length)}</p>
  ) : null;

  const chips = isSectioned ? (
    <CategoryChips
      categories={layoutCategories.map((category) => ({ key: category.key, name: category.name }))}
      activeKey={filters.category}
      onSelect={(key) => setCategory(key, catalog.categories)}
    />
  ) : null;

  if (filteredProducts.length === 0 && hasActiveFilters) {
    return (
      <div className="mx-auto max-w-3xl pt-5">
        {chips}
        {toolbar}
        <EmptyState message="No encontramos productos con esos filtros">
          <button
            type="button"
            onClick={clear}
            className="rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            Limpiar filtros
          </button>
        </EmptyState>
      </div>
    );
  }

  if (!isSectioned) {
    const sortedProducts = [...filteredProducts].sort((a, b) => {
      const orderA = categoriesByKey.get(a.categoryKey)?.sortOrder ?? 0;
      const orderB = categoriesByKey.get(b.categoryKey)?.sortOrder ?? 0;
      return orderA - orderB;
    });

    return (
      <>
        <div className="mx-auto max-w-3xl pt-5">
          {toolbar}
          {countLabel}
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 px-4 pt-5 pb-28 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
            {sortedProducts.map((product) => {
              const category = categoriesByKey.get(product.categoryKey);
              return category ? (
                <ProductCard key={product.id} product={product} category={category} />
              ) : null;
            })}
          </div>
        </div>
        <CartBar slug={slug ?? ''} catalog={catalog} />
      </>
    );
  }

  const productsByCategory = new Map<string, PublicProduct[]>();
  for (const product of filteredProducts) {
    const list = productsByCategory.get(product.categoryKey);
    if (list) {
      list.push(product);
    } else {
      productsByCategory.set(product.categoryKey, [product]);
    }
  }

  const sectionsToShow = (
    filters.category ? layoutCategories.filter((category) => category.key === filters.category) : layoutCategories
  ).filter((category) => (productsByCategory.get(category.key)?.length ?? 0) > 0);

  return (
    <>
      <div className="mx-auto max-w-3xl pt-5 pb-28">
        {chips}
        {toolbar}
        {countLabel}
        {sectionsToShow.map((category) => (
          <CategorySection key={category.key} title={category.name}>
            {(productsByCategory.get(category.key) ?? []).map((product) => (
              <ProductCard key={product.id} product={product} category={category} />
            ))}
          </CategorySection>
        ))}
      </div>
      <CartBar slug={slug ?? ''} catalog={catalog} />
    </>
  );
}
