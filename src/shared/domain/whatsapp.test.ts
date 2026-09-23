import { describe, expect, it } from 'vitest';
import { buildOrderMessage, buildWhatsAppUrl, productRef } from './whatsapp';
import type { CartItem, CartSummary } from '../types/cart.types';
import type { Currency } from '../types/tenant.types';
import type { PublicProduct } from '../types/api.types';

const blackSheep: PublicProduct = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
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
  choices: ['Grape / Strawberry Kiwi 🍇🍓🥝'],
};

const iceStorm: PublicProduct = {
  id: 'ffffffff-1111-2222-3333-444444444444',
  categoryKey: 'vapes',
  name: 'ICE STORM',
  description: null,
  image: null,
  priceCents: 2800000,
  currency: 'ARS',
  priceNote: null,
  stockMode: 'availability',
  stockQty: null,
  attributes: {},
  choices: ['Mint / Menthol'],
};

function validItem(product: PublicProduct, qty: number, choice: string | null): CartItem {
  return {
    line: { productId: product.id, choice, qty },
    product,
    unitPriceCents: product.priceCents,
    currency: product.currency,
    subtotalCents: product.priceCents * qty,
    issue: null,
    valid: true,
  };
}

function summaryOf(items: CartItem[]): CartSummary {
  const totals: Partial<Record<Currency, number>> = {};
  for (const item of items) {
    totals[item.currency] = (totals[item.currency] ?? 0) + item.subtotalCents;
  }
  return { items, validItems: items, totals, hasIssues: false };
}

describe('buildOrderMessage + buildWhatsAppUrl', () => {
  it('arma el mensaje exacto y la URL de wa.me decodifica al mismo texto (AC04)', () => {
    const summary = summaryOf([
      validItem(blackSheep, 2, 'Grape / Strawberry Kiwi 🍇🍓🥝'),
      validItem(iceStorm, 1, 'Mint / Menthol'),
    ]);

    const message = buildOrderMessage('BANNED', summary);

    expect(message).toBe(
      '¡Hola BANNED! Quiero hacer este pedido:\n\n' +
        '• 2 x THE BLACK SHEEP (Grape / Strawberry Kiwi 🍇🍓🥝) — $52.000\n' +
        '• 1 x ICE STORM (Mint / Menthol) — $28.000\n\n' +
        'Total: $80.000',
    );

    const url = buildWhatsAppUrl('5490000000000', message);
    expect(url.startsWith('https://wa.me/5490000000000?text=')).toBe(true);
    expect(decodeURIComponent(url.replace('https://wa.me/5490000000000?text=', ''))).toBe(message);
  });

  it('omite el paréntesis cuando no hay opción elegida', () => {
    const product = { ...blackSheep, choices: [] };
    const message = buildOrderMessage('BANNED', summaryOf([validItem(product, 1, null)]));
    expect(message).toContain('• 1 x THE BLACK SHEEP — $26.000');
  });

  it('agrega [ref XXXXXX] en productos con stockMode unit', () => {
    const product: PublicProduct = { ...blackSheep, stockMode: 'unit', choices: [] };
    const message = buildOrderMessage('BANNED', summaryOf([validItem(product, 1, null)]));
    expect(message).toContain(`[ref ${productRef(product.id)}]`);
  });

  it('agrega la nota de precio al final de la línea', () => {
    const product: PublicProduct = { ...blackSheep, priceNote: '2x', choices: [] };
    const message = buildOrderMessage('BANNED', summaryOf([validItem(product, 1, null)]));
    expect(message).toContain('— $26.000 — Nota: 2x');
  });

  it('usa "Total en pesos" / "Total en USD" cuando hay más de una moneda', () => {
    const usdProduct: PublicProduct = {
      ...iceStorm,
      id: 'usd-1',
      currency: 'USD',
      priceCents: 50000,
      choices: [],
    };
    const arsProduct = { ...blackSheep, choices: [] };

    const message = buildOrderMessage(
      'BANNED',
      summaryOf([validItem(arsProduct, 1, null), validItem(usdProduct, 1, null)]),
    );

    expect(message).toContain('Total en pesos: $26.000');
    expect(message).toContain('Total en USD: USD 500');
    expect(message).not.toContain('Total: ');
  });
});

describe('Apple AC05 — pedido con moneda mixta', () => {
  it('arma el mensaje exacto con ref para la unidad y totales separados por moneda', () => {
    const iphone: PublicProduct = {
      id: 'ffffffff-1111-2222-3333-444444444444',
      categoryKey: 'iphone',
      name: 'iPhone 14 128 (Red) 100%',
      description: null,
      image: null,
      priceCents: 41000,
      currency: 'USD',
      priceNote: null,
      stockMode: 'unit',
      stockQty: null,
      attributes: {},
      choices: [],
    };
    const cargador: PublicProduct = {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      categoryKey: 'accesorios',
      name: 'Cargador completo certificado',
      description: null,
      image: null,
      priceCents: 2200000,
      currency: 'ARS',
      priceNote: null,
      stockMode: 'quantity',
      stockQty: 5,
      attributes: {},
      choices: [],
    };

    const summary = summaryOf([validItem(iphone, 1, null), validItem(cargador, 1, null)]);
    const message = buildOrderMessage('miphone.mza', summary);

    expect(message).toContain(
      `• 1 x iPhone 14 128 (Red) 100% [ref ${productRef(iphone.id)}] — USD 410`,
    );
    expect(message).toContain('• 1 x Cargador completo certificado — $22.000');
    expect(message).toContain('Total en pesos: $22.000');
    expect(message).toContain('Total en USD: USD 410');
    expect(message).not.toContain('Total: ');
  });
});

describe('productRef', () => {
  it('toma los primeros 6 caracteres del UUID sin guiones, en mayúsculas', () => {
    expect(productRef('abcdef12-3456-7890-abcd-ef1234567890')).toBe('ABCDEF');
  });
});
