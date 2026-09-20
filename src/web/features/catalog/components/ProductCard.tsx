import { Link } from 'react-router';
import { formatMoney } from '../../../../shared/domain/money';
import { formatAttributeValue } from '../../../../shared/domain/attributes';
import { pluralize } from '../../../shared/text';
import { productImageUrl } from '../lib/product-image';
import type { PublicCategory, PublicProduct } from '../../../../shared/types/api.types';

const CARD_IMAGE_SIZE = 400;

interface ProductCardProps {
  product: PublicProduct;
  category: PublicCategory;
}

export function ProductCard({ product, category }: ProductCardProps) {
  const cardAttributes = category.attributeSchema.filter((attr) => attr.showInCard);
  const choiceCount = product.choices.length;
  const showChoices = Boolean(category.choiceLabel) && choiceCount > 0;

  return (
    <Link to={`p/${product.id}`} className="group flex flex-col transition active:opacity-60">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
        <img
          src={productImageUrl(product, 'thumb')}
          alt={product.name}
          loading="lazy"
          decoding="async"
          width={CARD_IMAGE_SIZE}
          height={CARD_IMAGE_SIZE}
          className="h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.04]"
        />
        {showChoices ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-white/85 px-2 py-1 text-[11px] leading-none font-semibold text-gray-700 backdrop-blur-sm">
            {choiceCount} {pluralize(category.choiceLabel ?? '', choiceCount)}
          </span>
        ) : null}
      </div>

      <h2 className="mt-2.5 line-clamp-2 text-sm leading-snug font-medium text-gray-900">
        {product.name}
      </h2>

      {cardAttributes.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {cardAttributes.map((attr) => {
            const value = product.attributes[attr.key];
            return value === undefined ? null : (
              <span
                key={attr.key}
                className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600"
              >
                {formatAttributeValue(attr, value)}
              </span>
            );
          })}
        </div>
      ) : null}

      <p className="mt-auto pt-1.5 text-[15px] leading-tight font-bold tracking-tight text-gray-900 tabular-nums">
        {formatMoney(product.priceCents, product.currency)}
      </p>
      {product.priceNote ? (
        <p className="mt-0.5 text-[11px] text-gray-500">{product.priceNote}</p>
      ) : null}
    </Link>
  );
}
