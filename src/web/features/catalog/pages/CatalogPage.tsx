import { useParams } from 'react-router';
import { useTenant } from '../../tenant/tenant-context';
import { ProductCard } from '../components/ProductCard';
import { CartBar } from '../../cart/components/CartBar';
import { EmptyState } from '../../../shared/components/EmptyState';

export function CatalogPage() {
  const { slug } = useParams<{ slug: string }>();
  const { catalog } = useTenant();

  if (catalog.products.length === 0) {
    return <EmptyState message="Todavía no hay productos disponibles" />;
  }

  const categoriesByKey = new Map(catalog.categories.map((category) => [category.key, category]));

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
