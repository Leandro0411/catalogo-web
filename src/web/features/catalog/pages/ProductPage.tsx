import { Link, useParams } from 'react-router';
import { useTenant } from '../../tenant/tenant-context';
import { formatMoney } from '../../../../shared/domain/money';
import { ProductAttributes } from '../components/ProductAttributes';
import { productImageUrl } from '../lib/product-image';
import { AddToCart } from '../../cart/components/AddToCart';

export function ProductPage() {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const { catalog } = useTenant();
  const product = catalog.products.find((item) => item.id === productId);

  if (!product) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p>Producto no disponible</p>
        <Link to=".." className="underline">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const category = catalog.categories.find((item) => item.key === product.categoryKey);

  return (
    <div className="flex flex-col gap-4 p-4">
      <img
        src={productImageUrl(product, 'full')}
        alt={product.name}
        loading="lazy"
        className="w-full rounded object-cover"
      />
      <h1 className="text-xl font-bold">{product.name}</h1>
      <p className="text-lg font-semibold">
        {formatMoney(product.priceCents, product.currency)}
        {product.priceNote ? ` ${product.priceNote}` : ''}
      </p>
      {category ? (
        <ProductAttributes
          attributeSchema={category.attributeSchema}
          attributes={product.attributes}
        />
      ) : null}
      {product.description ? <p>{product.description}</p> : null}
      <AddToCart slug={slug ?? ''} product={product} category={category} />
    </div>
  );
}
