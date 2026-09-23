import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { TenantLayout } from '../../tenant/TenantLayout';
import { CartPage } from './CartPage';

function catalogResponse() {
  return new Response(
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
        { key: 'vapes', name: 'Vapes', sortOrder: 0, attributeSchema: [], choiceLabel: 'Sabor' },
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
          choices: ['Grape / Strawberry Kiwi 🍇🍓🥝'],
        },
        {
          id: 'p2',
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
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function renderCartAt(slug: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/:slug',
        element: <TenantLayout />,
        children: [{ path: 'carrito', element: <CartPage /> }],
      },
    ],
    { initialEntries: [`/${slug}/carrito`] },
  );

  return render(<RouterProvider router={router} />);
}

function setCartLines(slug: string, lines: unknown[]): void {
  localStorage.setItem(`cat:cart:v1:${slug}`, JSON.stringify({ lines }));
}

describe('CartPage', () => {
  const assignMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: assignMock },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    assignMock.mockClear();
  });

  it('arma y envía el pedido por WhatsApp con el total correcto (AC04)', async () => {
    setCartLines('tienda-ac04', [
      { productId: 'p1', choice: 'Grape / Strawberry Kiwi 🍇🍓🥝', qty: 2 },
      { productId: 'p2', choice: 'Mint / Menthol', qty: 1 },
    ]);
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(catalogResponse()));

    const user = userEvent.setup();
    renderCartAt('tienda-ac04');

    const sendButton = await screen.findByRole('button', { name: 'Enviar pedido por WhatsApp' });
    await user.click(sendButton);

    expect(assignMock).toHaveBeenCalledTimes(1);
    const url = assignMock.mock.calls[0]?.[0] as string;
    expect(url.startsWith('https://wa.me/5490000000000?text=')).toBe(true);

    const decoded = decodeURIComponent(url.replace('https://wa.me/5490000000000?text=', ''));
    expect(decoded).toContain('• 2 x THE BLACK SHEEP (Grape / Strawberry Kiwi 🍇🍓🥝) — $52.000');
    expect(decoded).toContain('• 1 x ICE STORM (Mint / Menthol) — $28.000');
    expect(decoded).toContain('Total: $80.000');
  });

  it('muestra "Tu carrito está vacío" sin líneas (E04)', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(catalogResponse()));

    renderCartAt('tienda-e04');

    expect(await screen.findByText('Tu carrito está vacío')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Enviar pedido por WhatsApp' }),
    ).not.toBeInTheDocument();
  });

  it('marca un producto que ya no está en el catálogo como no disponible (E05)', async () => {
    setCartLines('tienda-e05', [{ productId: 'p-ausente', choice: null, qty: 1 }]);
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(catalogResponse()));

    renderCartAt('tienda-e05');

    expect(await screen.findByText('Este producto ya no está disponible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar pedido por WhatsApp' })).toBeDisabled();
  });

  it('muestra la nota de precio del producto bajo la línea', async () => {
    const response = catalogResponse();
    const body = await response.clone().json();
    body.products[0].priceNote = '2x $16.000';
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    setCartLines('tienda-nota', [{ productId: 'p1', choice: 'Grape / Strawberry Kiwi 🍇🍓🥝', qty: 1 }]);

    renderCartAt('tienda-nota');

    expect(await screen.findByText('2x $16.000')).toBeInTheDocument();
  });

  it('marca una opción que ya no está disponible (E06)', async () => {
    setCartLines('tienda-e06', [{ productId: 'p1', choice: 'Sabor Inexistente', qty: 1 }]);
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(catalogResponse()));

    renderCartAt('tienda-e06');

    expect(await screen.findByText('Esta opción ya no está disponible')).toBeInTheDocument();
  });
});
