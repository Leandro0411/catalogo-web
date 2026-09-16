import { useTenant } from '../../tenant/tenant-context';
import { ProductCard } from '../components/ProductCard';
import { EmptyState } from '../../../shared/components/EmptyState';

export function CatalogPage() {
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
    <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-4">
      {sortedProducts.map((product) => {
        const category = categoriesByKey.get(product.categoryKey);
        return category ? (
          <ProductCard key={product.id} product={product} category={category} />
        ) : null;
      })}
    </div>
  );
}
