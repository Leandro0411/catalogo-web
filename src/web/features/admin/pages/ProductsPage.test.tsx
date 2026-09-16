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
