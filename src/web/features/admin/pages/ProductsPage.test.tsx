import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ProductsPage } from './ProductsPage';
import type { AdminCategory, AdminProduct } from '../../../../shared/types/api.types';

function renderProductsPage() {
  const router = createMemoryRouter(
    [
      { path: '/admin', element: <ProductsPage /> },
      { path: '/admin/productos/nuevo', element: <div>Nuevo producto page</div> },
      { path: '/admin/productos/:id', element: <div>Editar producto page</div> },
    ],
    { initialEntries: ['/admin'] },
  );

  return render(<RouterProvider router={router} />);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const category: AdminCategory = {
  id: 'cat-1',
  key: 'vapes',
  name: 'Vapes',
  sortOrder: 0,
  attributeSchema: [],
  choiceLabel: 'Sabor',
  defaultStockMode: 'availability',
  defaultCurrency: 'ARS',
};

const product: AdminProduct = {
  id: 'p1',
  categoryId: 'cat-1',
  categoryKey: 'vapes',
  name: 'THE BLACK SHEEP',
  description: null,
  imageKey: null,
  priceCents: 2600000,
  currency: 'ARS',
  priceNote: null,
  stockMode: 'availability',
  stockQty: null,
  status: 'active',
  attributes: {},
  choices: [],
  hiddenReason: null,
  updatedAt: '2026-09-14 00:00:00',
};

function urlOf(input: RequestInfo | URL): string {
  return typeof input === 'string' ? input : input.toString();
}

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('agrupa los productos por categoría con su contador', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes('/categories')) {
        return Promise.resolve(jsonResponse(200, [category]));
      }
      return Promise.resolve(jsonResponse(200, [product]));
    });

    renderProductsPage();

    expect(await screen.findByText('Vapes (1)')).toBeInTheDocument();
    expect(screen.getByText('THE BLACK SHEEP')).toBeInTheDocument();
  });

  it('el switch llama a PATCH y actualiza la insignia', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = urlOf(input);
      if (url.includes('/categories')) {
        return Promise.resolve(jsonResponse(200, [category]));
      }
      if (url.includes('/status')) {
        expect(init?.method).toBe('PATCH');
        return Promise.resolve(
          jsonResponse(200, { ...product, status: 'paused', hiddenReason: 'PAUSED' }),
        );
      }
      return Promise.resolve(jsonResponse(200, [product]));
    });

    renderProductsPage();

    const toggle = await screen.findByRole('switch', { name: 'Disponible' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    await user.click(toggle);

    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    expect(await screen.findByText('No visible · Pausado')).toBeInTheDocument();
  });

  it('"Registrar venta" con 2 actualiza el chip a "Stock: 6"', async () => {
    const user = userEvent.setup();
    const quantityProduct: AdminProduct = {
      ...product,
      id: 'p2',
      name: 'Fundas Silicona case',
      stockMode: 'quantity',
      stockQty: 8,
    };

    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = urlOf(input);
      if (url.includes('/categories')) {
        return Promise.resolve(jsonResponse(200, [category]));
      }
      if (url.includes('/sale')) {
        expect(init?.method).toBe('POST');
        return Promise.resolve(jsonResponse(200, { ...quantityProduct, stockQty: 6 }));
      }
      return Promise.resolve(jsonResponse(200, [quantityProduct]));
    });

    renderProductsPage();

    await user.click(await screen.findByText('Registrar venta'));
    await user.clear(screen.getByLabelText('Cantidad'));
    await user.type(screen.getByLabelText('Cantidad'), '2');
    await user.click(screen.getByText('Registrar'));

    expect(await screen.findByText('Stock: 6')).toBeInTheDocument();
  });

  it('"Vendido" muestra la insignia y, con "Mostrar vendidos" apagado, el ítem desaparece de la lista', async () => {
    const user = userEvent.setup();
    const unitProduct: AdminProduct = {
      ...product,
      id: 'p3',
      name: 'iPhone 17 256GB (Sage)',
      stockMode: 'unit',
    };

    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes('/categories')) {
        return Promise.resolve(jsonResponse(200, [category]));
      }
      if (url.includes('/sale')) {
        return Promise.resolve(
          jsonResponse(200, { ...unitProduct, status: 'sold', hiddenReason: 'SOLD' }),
        );
      }
      return Promise.resolve(jsonResponse(200, [unitProduct]));
    });

    renderProductsPage();

    await user.click(await screen.findByRole('switch', { name: 'Mostrar vendidos' }));
    await user.click(await screen.findByText('Vendido'));

    expect(await screen.findByText('No visible · Vendido')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Mostrar vendidos' }));
    expect(screen.queryByText('iPhone 17 256GB (Sage)')).not.toBeInTheDocument();
  });

  it('ante un error del PATCH, el switch vuelve al estado anterior', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes('/categories')) {
        return Promise.resolve(jsonResponse(200, [category]));
      }
      if (url.includes('/status')) {
        return Promise.resolve(
          jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'Error interno' } }),
        );
      }
      return Promise.resolve(jsonResponse(200, [product]));
    });

    renderProductsPage();

    const toggle = await screen.findByRole('switch', { name: 'Disponible' });
    await user.click(toggle);

    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
  });
});
