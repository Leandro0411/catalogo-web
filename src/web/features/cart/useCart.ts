import { useCallback, useSyncExternalStore } from 'react';
import {
  addLine as addLineToCart,
  removeLine as removeLineFromCart,
  updateLineQty as updateLineQtyInCart,
} from '../../../shared/domain/cart';
import type { AddLineResult, CartLine } from '../../../shared/types/cart.types';
import type { PublicProduct } from '../../../shared/types/api.types';
import { getCartSnapshot, setCartLines, subscribe } from './cart.store';

export interface UseCartResult {
  lines: CartLine[];
  count: number;
  add: (input: CartLine, product: PublicProduct) => AddLineResult;
  updateQty: (productId: string, choice: string | null, qty: number) => void;
  remove: (productId: string, choice: string | null) => void;
  clear: () => void;
}

export function useCart(slug: string): UseCartResult {
  const lines = useSyncExternalStore(
    (listener) => subscribe(slug, listener),
    () => getCartSnapshot(slug),
  );

  const add = useCallback(
    (input: CartLine, product: PublicProduct): AddLineResult => {
      const { lines: updated, result } = addLineToCart(getCartSnapshot(slug), input, product);
      if (result !== 'cart-full') {
        setCartLines(slug, updated);
      }
      return result;
    },
    [slug],
  );

  const updateQty = useCallback(
    (productId: string, choice: string | null, qty: number) => {
      setCartLines(slug, updateLineQtyInCart(getCartSnapshot(slug), productId, choice, qty));
    },
    [slug],
  );

  const remove = useCallback(
    (productId: string, choice: string | null) => {
      setCartLines(slug, removeLineFromCart(getCartSnapshot(slug), productId, choice));
    },
    [slug],
  );

  const clear = useCallback(() => {
    setCartLines(slug, []);
  }, [slug]);

  const count = lines.reduce((sum, line) => sum + line.qty, 0);

  return { lines, count, add, updateQty, remove, clear };
}
