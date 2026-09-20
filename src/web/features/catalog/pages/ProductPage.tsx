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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-base font-semibold">Producto no disponible</p>
        <Link
          to=".."
          className="rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const category = catalog.categories.find((item) => item.key === product.categoryKey);

  return (
    <div className="mx-auto max-w-3xl pb-36">
      {/* object-contain: la foto del producto se ve entera, sin recorte, sea cual
          sea la proporcion con que la subio el negocio. */}
      <div className="bg-gray-50">
        <img
          src={productImageUrl(product, 'full')}
          alt={product.name}
          decoding="async"
          fetchPriority="high"
          className="mx-auto aspect-[4/5] w-full max-w-xl object-contain"
        />
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-white px-4 pt-6">
        {category ? (
          <span className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
            {category.name}
          </span>
        ) : null}

        <h1 className="mt-1.5 text-[22px] leading-tight font-bold tracking-tight text-gray-900">
          {product.name}
        </h1>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-[26px] leading-none font-bold tracking-tight text-gray-900 tabular-nums">
            {formatMoney(product.priceCents, product.currency)}
          </p>
          {product.priceNote ? (
            <span className="text-sm text-gray-500">{product.priceNote}</span>
          ) : null}
        </div>

        <AddToCart slug={slug ?? ''} product={product} category={category} />

        {product.description ? (
          <p className="mt-7 text-[15px] leading-relaxed whitespace-pre-line text-gray-600">
            {product.description}
          </p>
        ) : null}

        {category ? (
          <ProductAttributes
            attributeSchema={category.attributeSchema}
            attributes={product.attributes}
          />
        ) : null}
      </div>
    </div>
  );
}
