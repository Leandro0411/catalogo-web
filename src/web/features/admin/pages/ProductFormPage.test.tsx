import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { ProductFormPage } from './ProductFormPage';
import { AdminContext } from '../admin-context';
import type { AdminContextValue } from '../admin-context';
import type { AdminCategory, AdminProduct } from '../../../../shared/types/api.types';

const adminValue: AdminContextValue = {
  me: {
    username: 'leandro',
    tenant: { slug: 'banned', name: 'BANNED', primaryColor: '#000000', currency: 'ARS' },
  },
  refresh: () => {},
};

const vapesCategory: AdminCategory = {
  id: '11111111-1111-4111-8111-111111111111',
  key: 'vapes',
  name: 'Vapes',
  sortOrder: 0,
  attributeSchema: [
    { key: 'puffs', label: 'Puffs', type: 'number', unit: 'puffs', required: true },
  ],
  choiceLabel: 'Sabor',
  defaultStockMode: 'availability',
  defaultCurrency: 'ARS',
};

const savedProduct: AdminProduct = {
  id: 'p1',
  categoryId: vapesCategory.id,
  categoryKey: 'vapes',
  name: 'ICE STORM',
  description: null,
  imageKey: null,
  priceCents: 2800000,
  currency: 'ARS',
  priceNote: null,
  stockMode: 'availability',
  stockQty: null,
  status: 'active',
  attributes: { puffs: 25000 },
  choices: [
    { value: 'Mint', available: true },
    { value: 'Menthol', available: true },
  ],
  hiddenReason: null,
  updatedAt: '2026-09-16 00:00:00',
};

function renderProductFormPage(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/admin',
        element: (
          <AdminContext.Provider value={adminValue}>
            <Outlet />
          </AdminContext.Provider>
        ),
        children: [
          { index: true, element: <div>Panel admin</div> },
          { path: 'productos/nuevo', element: <ProductFormPage /> },
          { path: 'productos/:id', element: <ProductFormPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );

  return render(<RouterProvider router={router} />);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function urlOf(input: RequestInfo | URL): string {
  return typeof input === 'string' ? input : input.toString();
}

describe('ProductFormPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('alta con categoría Vapes, nombre, precio y dos sabores envía el POST esperado y navega a /admin', async () => {
    const user = userEvent.setup();
    let capturedBody: unknown = null;

    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = urlOf(input);

      if (url.includes('/categories')) {
        return Promise.resolve(jsonResponse(200, [vapesCategory]));
      }

      if (url.includes('/products') && init?.method === 'POST') {
        capturedBody = JSON.parse(String(init.body));
        return Promise.resolve(jsonResponse(201, savedProduct));
      }

      return Promise.resolve(
        jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'No encontrado' } }),
      );
    });

    renderProductFormPage('/admin/productos/nuevo');

    await user.type(await screen.findByLabelText('Nombre'), 'ICE STORM');
    await user.type(screen.getByLabelText('Precio'), '28.000');
    await user.type(screen.getByLabelText(/^Puffs/), '25000');

    const choiceInput = screen.getByLabelText('Agregar sabor');
    await user.type(choiceInput, 'Mint{Enter}');
    await user.type(choiceInput, 'Menthol{Enter}');

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await screen.findByText('Panel admin');

    const body = capturedBody as Record<string, unknown> | null;

    if (body === null) {
      throw new Error('El POST nunca se llamó');
    }

    expect(body.categoryId).toBe(vapesCategory.id);
    expect(body.name).toBe('ICE STORM');
    expect(body.priceCents).toBe(2800000);
    expect(body.attributes).toEqual({ puffs: 25000 });
    expect(body.choices).toEqual([
      { value: 'Mint', available: true },
      { value: 'Menthol', available: true },
    ]);
  });
});
