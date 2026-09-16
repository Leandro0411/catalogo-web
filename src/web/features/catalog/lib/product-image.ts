import type { PublicProduct } from '../../../../shared/types/api.types';

const PLACEHOLDER_IMAGE_PATH = '/placeholder.svg';

export function productImageUrl(product: PublicProduct, variant: 'thumb' | 'full'): string {
  return product.image ? product.image[variant] : PLACEHOLDER_IMAGE_PATH;
}
