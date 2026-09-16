import { describe, expect, it } from 'vitest';
import { MAX_CART_LINES, MAX_QTY_PER_LINE } from '../constants';
import { addLine, maxQtyFor, reconcileCart, removeLine, updateLineQty } from './cart';
import type { PublicCatalogResponse, PublicCategory, PublicProduct } from '../types/api.types';
import type { CartLine } from '../types/cart.types';

function makeProduct(overrides: Partial<PublicProduct> = {}): PublicProduct {
  return {
    id: 'p1',
    categoryKey: 'vapes',
    name: 'THE BLACK SHEEP',
    description: null,
    image: null,
    priceCents: 2600000,
    currency: 'ARS',
    priceNote: null,
    stockMode: 'availability',
    stockQty: null,
    attributes: {},
    choices: ['Grape / Strawberry Kiwi 🍇🍓🥝', 'Watermelon Ice 🍉🧊'],
    ...overrides,
  };
}

function makeCategory(overrides: Partial<PublicCategory> = {}): PublicCategory {
  return {
    key: 'vapes',
    name: 'Vapes',
    sortOrder: 0,
    attributeSchema: [],
    choiceLabel: 'Sabor',
    ...overrides,
  };
}

function makeCatalog(
  products: PublicProduct[],
  categories: PublicCategory[],
): PublicCatalogResponse {
  return {
    tenant: {
      slug: 'banned',
      name: 'BANNED',
      logoUrl: null,
      primaryColor: '#111111',
      whatsapp: '5490000000000',
      currency: 'ARS',
      ageGate: true,
    },
    categories,
    products,
  };
}

describe('maxQtyFor', () => {
  it('recorta a 1 en modo unit', () => {
    expect(maxQtyFor(makeProduct({ stockMode: 'unit' }))).toBe(1);
  });

  it('recorta al stock en modo quantity', () => {
    expect(maxQtyFor(makeProduct({ stockMode: 'quantity', stockQty: 3 }))).toBe(3);
  });

  it('usa MAX_QTY_PER_LINE en modo availability', () => {
    expect(maxQtyFor(makeProduct({ stockMode: 'availability' }))).toBe(MAX_QTY_PER_LINE);
  });
});

describe('addLine', () => {
  it('agrega una línea nueva', () => {
    const { lines, result } = addLine(
      [],
      { productId: 'p1', choice: 'Grape', qty: 2 },
      makeProduct(),
    );
    expect(result).toBe('added');
    expect(lines).toEqual([{ productId: 'p1', choice: 'Grape', qty: 2 }]);
  });

  it('suma la cantidad si la línea ya existe (misma clave productId+choice)', () => {
    const existing: CartLine[] = [{ productId: 'p1', choice: 'Grape', qty: 2 }];
    const { lines, result } = addLine(
      existing,
      { productId: 'p1', choice: 'Grape', qty: 3 },
      makeProduct(),
    );
    expect(result).toBe('added');
    expect(lines).toEqual([{ productId: 'p1', choice: 'Grape', qty: 5 }]);
  });

  it('recorta al máximo y devuelve "clamped"', () => {
    const { lines, result } = addLine(
      [],
      { productId: 'p1', choice: 'Grape', qty: 999 },
      makeProduct({ stockMode: 'unit' }),
    );
    expect(result).toBe('clamped');
    expect(lines[0]?.qty).toBe(1);
  });

  it('devuelve "cart-full" al intentar una línea 31 sin modificar el carrito', () => {
    const fullCart: CartLine[] = Array.from({ length: MAX_CART_LINES }, (_, i) => ({
      productId: `p${i}`,
      choice: null,
      qty: 1,
    }));

    const { lines, result } = addLine(
      fullCart,
      { productId: 'p-new', choice: null, qty: 1 },
      makeProduct(),
    );

    expect(result).toBe('cart-full');
    expect(lines).toBe(fullCart);
    expect(lines).toHaveLength(MAX_CART_LINES);
  });
});

describe('updateLineQty y removeLine', () => {
  const lines: CartLine[] = [{ productId: 'p1', choice: 'Grape', qty: 2 }];

  it('actualiza la cantidad sin mutar el arreglo original', () => {
    const updated = updateLineQty(lines, 'p1', 'Grape', 5);
    expect(updated).toEqual([{ productId: 'p1', choice: 'Grape', qty: 5 }]);
    expect(lines[0]?.qty).toBe(2);
  });

  it('elimina la línea correspondiente', () => {
    const updated = removeLine(lines, 'p1', 'Grape');
    expect(updated).toEqual([]);
    expect(lines).toHaveLength(1);
  });
});

describe('reconcileCart', () => {
  it('marca UNAVAILABLE un producto que ya no está en el catálogo (E05)', () => {
    const catalog = makeCatalog([], [makeCategory()]);
    const summary = reconcileCart([{ productId: 'p1', choice: 'Grape', qty: 1 }], catalog);

    expect(summary.items[0]?.issue).toBe('UNAVAILABLE');
    expect(summary.items[0]?.valid).toBe(false);
    expect(summary.validItems).toHaveLength(0);
  });

  it('marca CHOICE_UNAVAILABLE si el sabor ya no está disponible (E06)', () => {
    const catalog = makeCatalog(
      [makeProduct({ choices: ['Watermelon Ice 🍉🧊'] })],
      [makeCategory()],
    );
    const summary = reconcileCart([{ productId: 'p1', choice: 'Grape', qty: 1 }], catalog);

    expect(summary.items[0]?.issue).toBe('CHOICE_UNAVAILABLE');
    expect(summary.items[0]?.valid).toBe(false);
  });

  it('ajusta la cantidad al stock disponible con QTY_ADJUSTED', () => {
    const catalog = makeCatalog(
      [makeProduct({ stockMode: 'quantity', stockQty: 2, choices: [] })],
      [makeCategory({ choiceLabel: null })],
    );
    const summary = reconcileCart([{ productId: 'p1', choice: null, qty: 5 }], catalog);

    expect(summary.items[0]?.issue).toBe('QTY_ADJUSTED');
    expect(summary.items[0]?.valid).toBe(true);
    expect(summary.items[0]?.line.qty).toBe(2);
  });

  it('calcula totales por moneda sin combinarlas', () => {
    const catalog = makeCatalog(
      [
        makeProduct({ id: 'p1', currency: 'ARS', priceCents: 2600000, choices: [] }),
        makeProduct({ id: 'p2', currency: 'USD', priceCents: 50000, choices: [] }),
      ],
      [makeCategory({ choiceLabel: null })],
    );
    const summary = reconcileCart(
      [
        { productId: 'p1', choice: null, qty: 1 },
        { productId: 'p2', choice: null, qty: 2 },
      ],
      catalog,
    );

    expect(summary.totals).toEqual({ ARS: 2600000, USD: 100000 });
  });
});
