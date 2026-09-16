const AGE_OK_PREFIX = 'cat:age-ok:';
const CART_PREFIX = 'cat:cart:v1:';

export function ageOkKey(slug: string): string {
  return `${AGE_OK_PREFIX}${slug}`;
}

export function cartKey(slug: string): string {
  return `${CART_PREFIX}${slug}`;
}
