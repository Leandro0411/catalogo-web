import { Link } from 'react-router';
import { formatMoney } from '../../../../shared/domain/money';
import { formatAttributeValue } from '../../../../shared/domain/attributes';
import { pluralize } from '../../../shared/text';
import { productImageUrl } from '../lib/product-image';
import type { PublicCategory, PublicProduct } from '../../../../shared/types/api.types';

const CARD_IMAGE_SIZE = 200;

interface ProductCardProps {
  product: PublicProduct;
  category: PublicCategory;
}

export function ProductCard({ product, category }: ProductCardProps) {
  const cardAttributes = category.attributeSchema.filter((attr) => attr.showInCard);

  return (
    <Link to={`p/${product.id}`} className="flex flex-col gap-2 rounded border p-3">
      <img
        src={productImageUrl(product, 'thumb')}
        alt={product.name}
        loading="lazy"
        width={CARD_IMAGE_SIZE}
        height={CARD_IMAGE_SIZE}
        className="aspect-square w-full rounded object-cover"
      />
      <span className="font-semibold">{product.name}</span>
      {cardAttributes.map((attr) => {
        const value = product.attributes[attr.key];
        return value === undefined ? null : (
          <span key={attr.key} className="text-sm text-gray-600">
            {formatAttributeValue(attr, value)}
          </span>
        );
      })}
      <span className="font-bold">
        {formatMoney(product.priceCents, product.currency)}
        {product.priceNote ? ` ${product.priceNote}` : ''}
      </span>
      {category.choiceLabel && product.choices.length > 0 ? (
        <span className="text-sm text-gray-500">
          {product.choices.length} {pluralize(category.choiceLabel, product.choices.length)}
        </span>
      ) : null}
    </Link>
  );
}
