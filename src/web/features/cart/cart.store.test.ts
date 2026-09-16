import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCartSnapshot, setCartLines, subscribe } from './cart.store';

describe('cart.store', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('persiste las líneas y las lee de vuelta', () => {
    setCartLines('tienda-a', [{ productId: 'p1', choice: null, qty: 2 }]);

    expect(getCartSnapshot('tienda-a')).toEqual([{ productId: 'p1', choice: null, qty: 2 }]);
    expect(localStorage.getItem('cat:cart:v1:tienda-a')).toBe(
      JSON.stringify({ lines: [{ productId: 'p1', choice: null, qty: 2 }] }),
    );
  });

  it('devuelve un carrito vacío si el JSON guardado es inválido', () => {
    localStorage.setItem('cat:cart:v1:tienda-b', 'esto no es json');

    expect(getCartSnapshot('tienda-b')).toEqual([]);
  });

  it('devuelve una referencia estable mientras no haya cambios', () => {
    setCartLines('tienda-c', [{ productId: 'p1', choice: null, qty: 1 }]);

    expect(getCartSnapshot('tienda-c')).toBe(getCartSnapshot('tienda-c'));
  });

  it('notifica a los suscriptores al cambiar y deja de hacerlo tras desuscribirse', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe('tienda-d', listener);

    setCartLines('tienda-d', [{ productId: 'p1', choice: null, qty: 1 }]);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setCartLines('tienda-d', []);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('funciona en memoria si localStorage lanza (E07)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    setCartLines('tienda-e', [{ productId: 'p1', choice: null, qty: 3 }]);

    expect(getCartSnapshot('tienda-e')).toEqual([{ productId: 'p1', choice: null, qty: 3 }]);
  });
});
