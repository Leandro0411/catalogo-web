import { useParams, useSearchParams } from 'react-router';
import { useTenant } from '../../tenant/tenant-context';
import { ProductCard } from '../components/ProductCard';
import { CategoryChips } from '../components/CategoryChips';
import { CategorySection } from '../components/CategorySection';
import { CartBar } from '../../cart/components/CartBar';
import { EmptyState } from '../../../shared/components/EmptyState';
import type { PublicProduct } from '../../../../shared/types/api.types';

export function CatalogPage() {
  const { slug } = useParams<{ slug: string }>();
  const { catalog } = useTenant();
  const [searchParams] = useSearchParams();

  if (catalog.products.length === 0) {
    return <EmptyState message="Todavía no hay productos disponibles" />;
  }

  const categoriesByKey = new Map(catalog.categories.map((category) => [category.key, category]));

  const productsByCategory = new Map<string, PublicProduct[]>();
  for (const product of catalog.products) {
    const list = productsByCategory.get(product.categoryKey);
    if (list) {
      list.push(product);
    } else {
      productsByCategory.set(product.categoryKey, [product]);
    }
  }

  const categoriesWithProducts = [...catalog.categories]
    .filter((category) => (productsByCategory.get(category.key)?.length ?? 0) > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (categoriesWithProducts.length <= 1) {
    const sortedProducts = [...catalog.products].sort((a, b) => {
      const orderA = categoriesByKey.get(a.categoryKey)?.sortOrder ?? 0;
      const orderB = categoriesByKey.get(b.categoryKey)?.sortOrder ?? 0;
      return orderA - orderB;
    });

    return (
      <>
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-x-3 gap-y-7 px-4 pt-5 pb-28 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
          {sortedProducts.map((product) => {
            const category = categoriesByKey.get(product.categoryKey);
            return category ? (
              <ProductCard key={product.id} product={product} category={category} />
            ) : null;
          })}
        </div>
        <CartBar slug={slug ?? ''} catalog={catalog} />
      </>
    );
  }

  const activeKey = searchParams.get('cat');
  const sectionsToShow = activeKey
    ? categoriesWithProducts.filter((category) => category.key === activeKey)
    : categoriesWithProducts;

  return (
    <>
      <div className="mx-auto max-w-3xl pt-5 pb-28">
        <CategoryChips
          categories={categoriesWithProducts.map((category) => ({
            key: category.key,
            name: category.name,
          }))}
        />
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
