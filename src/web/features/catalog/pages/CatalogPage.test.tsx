import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { TenantLayout } from '../../tenant/TenantLayout';
import { CatalogPage } from './CatalogPage';

function renderCatalogAt(slug: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/:slug',
        element: <TenantLayout />,
        children: [{ index: true, element: <CatalogPage /> }],
      },
    ],
    { initialEntries: [`/${slug}`] },
  );

  return render(<RouterProvider router={router} />);
}

function bannedCatalogResponse() {
  return new Response(
    JSON.stringify({
      tenant: {
        slug: 'banned',
        name: 'BANNED',
        logoUrl: null,
        primaryColor: '#111111',
        whatsapp: '5490000000000',
        currency: 'ARS',
        ageGate: true,
      },
      categories: [
        {
          key: 'vapes',
          name: 'Vapes',
          sortOrder: 0,
          attributeSchema: [
            { key: 'puffs', label: 'Puffs', type: 'number', unit: 'puffs', showInCard: true },
          ],
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
          attributes: { puffs: 30000 },
          choices: ['Grape / Strawberry Kiwi 🍇🍓🥝'],
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function demoCatalogResponse() {
  return new Response(
    JSON.stringify({
      tenant: {
        slug: 'demo',
        name: 'Tienda Demo',
        logoUrl: null,
        primaryColor: '#2563EB',
        whatsapp: '5490000000001',
        currency: 'ARS',
        ageGate: false,
      },
      categories: [
        { key: 'general', name: 'General', sortOrder: 0, attributeSchema: [], choiceLabel: null },
      ],
      products: [
        {
          id: 'p2',
          categoryKey: 'general',
          name: 'Producto Demo',
          description: null,
          image: null,
          priceCents: 100000,
          currency: 'ARS',
          priceNote: null,
          stockMode: 'availability',
          stockQty: null,
          attributes: {},
          choices: [],
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('tras aceptar el aviso +18 muestra los productos visibles (AC01)', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(bannedCatalogResponse());

    renderCatalogAt('banned');

    expect(await screen.findByText(/mayor de edad/i)).toBeInTheDocument();
    expect(screen.queryByText('THE BLACK SHEEP')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /soy mayor de 18/i }));

    expect(await screen.findByText('THE BLACK SHEEP')).toBeInTheDocument();
    expect(screen.getByText('$26.000')).toBeInTheDocument();
    expect(screen.getByText('30.000 puffs')).toBeInTheDocument();
    expect(localStorage.getItem('cat:age-ok:banned')).toBe('1');
  });

  it('bloquea el acceso si elige "Soy menor de 18" (E02)', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(bannedCatalogResponse());

    renderCatalogAt('banned');

    await user.click(await screen.findByRole('button', { name: /soy menor de 18/i }));

    expect(await screen.findByText(/lo sentimos/i)).toBeInTheDocument();
    expect(screen.queryByText('THE BLACK SHEEP')).not.toBeInTheDocument();
  });

  it('muestra la grilla directamente si el tenant no tiene aviso +18', async () => {
    vi.mocked(fetch).mockResolvedValue(demoCatalogResponse());

    renderCatalogAt('demo');

    expect(await screen.findByText('Producto Demo')).toBeInTheDocument();
  });
});
