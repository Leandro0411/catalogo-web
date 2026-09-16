import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { TenantLayout } from '../../tenant/TenantLayout';
import { ProductPage } from './ProductPage';

function renderProductAt(slug: string, productId: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/:slug',
        element: <TenantLayout />,
        children: [{ path: 'p/:productId', element: <ProductPage /> }],
      },
    ],
    { initialEntries: [`/${slug}/p/${productId}`] },
  );

  return render(<RouterProvider router={router} />);
}

describe('ProductPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('muestra los sabores disponibles bajo el título Sabor', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          tenant: {
            slug: 'banned',
            name: 'BANNED',
            logoUrl: null,
            primaryColor: '#111111',
            whatsapp: '5490000000000',
            currency: 'ARS',
            ageGate: false,
          },
          categories: [
            {
              key: 'vapes',
              name: 'Vapes',
              sortOrder: 0,
              attributeSchema: [],
              choiceLabel: 'Sabor',
            },
          ],
          products: [
            {
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
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderProductAt('banned', 'p1');

    expect(await screen.findByText('Sabor')).toBeInTheDocument();
    expect(screen.getByText('Grape / Strawberry Kiwi 🍇🍓🥝')).toBeInTheDocument();
    expect(screen.getByText('Watermelon Ice 🍉🧊')).toBeInTheDocument();
  });
});
