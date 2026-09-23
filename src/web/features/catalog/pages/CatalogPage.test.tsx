import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { TenantLayout } from '../../tenant/TenantLayout';
import { CatalogPage } from './CatalogPage';

function renderCatalogAt(slug: string, search = '') {
  const router = createMemoryRouter(
    [
      {
        path: '/:slug',
        element: <TenantLayout />,
        children: [{ index: true, element: <CatalogPage /> }],
      },
    ],
    { initialEntries: [`/${slug}${search}`] },
  );

  return { ...render(<RouterProvider router={router} />), router };
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

function miphoneCatalogResponse() {
  return new Response(
    JSON.stringify({
      tenant: {
        slug: 'miphone',
        name: 'miphone.mza',
        logoUrl: null,
        primaryColor: '#0A84FF',
        whatsapp: '5490000000002',
        currency: 'USD',
        ageGate: false,
      },
      categories: [
        {
          key: 'iphone',
          name: 'iPhones',
          sortOrder: 0,
          attributeSchema: [
            { key: 'capacidad', label: 'Capacidad', type: 'text', showInCard: true },
            { key: 'color', label: 'Color', type: 'text', showInCard: true },
            { key: 'condicion', label: 'Estado', type: 'text', showInCard: true },
            { key: 'bateria', label: 'Batería', type: 'number', unit: '%', showInCard: true },
          ],
          choiceLabel: null,
        },
        {
          key: 'macbook',
          name: 'MacBooks',
          sortOrder: 1,
          attributeSchema: [],
          choiceLabel: null,
        },
        {
          key: 'accesorios',
          name: 'Accesorios',
          sortOrder: 4,
          attributeSchema: [],
          choiceLabel: null,
        },
      ],
      products: [
        {
          id: 'iphone-1',
          categoryKey: 'iphone',
          name: 'iPhone 15 Pro Max 256GB (Natural) 87%',
          description: null,
          image: null,
          priceCents: 73500,
          currency: 'USD',
          priceNote: null,
          stockMode: 'unit',
          stockQty: null,
          attributes: { capacidad: '256GB', color: 'Natural', condicion: 'Usado', bateria: 87 },
          choices: [],
        },
        {
          id: 'macbook-1',
          categoryKey: 'macbook',
          name: 'MacBook Air M3 13 16GB 512GB (Midnight)',
          description: null,
          image: null,
          priceCents: 129900,
          currency: 'USD',
          priceNote: null,
          stockMode: 'quantity',
          stockQty: 2,
          attributes: {},
          choices: [],
        },
        {
          id: 'fundas-1',
          categoryKey: 'accesorios',
          name: 'Fundas Silicona case',
          description: null,
          image: null,
          priceCents: 1050000,
          currency: 'ARS',
          priceNote: '2x $16.000',
          stockMode: 'quantity',
          stockQty: 8,
          attributes: {},
          choices: [],
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function miphoneWithFiltersCatalogResponse() {
  return new Response(
    JSON.stringify({
      tenant: {
        slug: 'miphone',
        name: 'miphone.mza',
        logoUrl: null,
        primaryColor: '#0A84FF',
        whatsapp: '5490000000002',
        currency: 'USD',
        ageGate: false,
      },
      categories: [
        {
          key: 'iphone',
          name: 'iPhones',
          sortOrder: 0,
          attributeSchema: [
            {
              key: 'condicion',
              label: 'Estado',
              type: 'enum',
              options: ['Sellado', 'Usado', 'AS IS'],
              filter: 'multi',
              showInCard: true,
            },
            {
              key: 'bateria',
              label: 'Batería',
              type: 'number',
              unit: '%',
              filter: 'min',
              showInCard: true,
            },
          ],
          choiceLabel: null,
        },
        {
          key: 'accesorios',
          name: 'Accesorios',
          sortOrder: 4,
          attributeSchema: [],
          choiceLabel: null,
        },
      ],
      products: [
        {
          id: 'iphone-87',
          categoryKey: 'iphone',
          name: 'iPhone 15 Pro Max 256GB (Natural) 87%',
          description: null,
          image: null,
          priceCents: 73500,
          currency: 'USD',
          priceNote: null,
          stockMode: 'unit',
          stockQty: null,
          attributes: { condicion: 'Usado', bateria: 87 },
          choices: [],
        },
        {
          id: 'iphone-100',
          categoryKey: 'iphone',
          name: 'iPhone 15 Pro 128GB (Black) 100%',
          description: null,
          image: null,
          priceCents: 66500,
          currency: 'USD',
          priceNote: null,
          stockMode: 'unit',
          stockQty: null,
          attributes: { condicion: 'Usado', bateria: 100 },
          choices: [],
        },
        {
          id: 'iphone-100-asis',
          categoryKey: 'iphone',
          name: 'iPhone 14 Pro 128GB (Black) 100% AS IS',
          description: null,
          image: null,
          priceCents: 57000,
          currency: 'USD',
          priceNote: null,
          stockMode: 'unit',
          stockQty: null,
          attributes: { condicion: 'AS IS', bateria: 100 },
          choices: [],
        },
        {
          id: 'iphone-84',
          categoryKey: 'iphone',
          name: 'iPhone 13 128GB (Blue) 84%',
          description: null,
          image: null,
          priceCents: 38000,
          currency: 'USD',
          priceNote: null,
          stockMode: 'unit',
          stockQty: null,
          attributes: { condicion: 'Usado', bateria: 84 },
          choices: [],
        },
        {
          id: 'iphone-sellado',
          categoryKey: 'iphone',
          name: 'iPhone 17 256GB (Sage)',
          description: null,
          image: null,
          priceCents: 108000,
          currency: 'USD',
          priceNote: null,
          stockMode: 'unit',
          stockQty: null,
          attributes: { condicion: 'Sellado' },
          choices: [],
        },
        {
          id: 'iphone-white-96',
          categoryKey: 'iphone',
          name: 'iPhone 15 (White) 96%',
          description: null,
          image: null,
          priceCents: 72000,
          currency: 'USD',
          priceNote: null,
          stockMode: 'unit',
          stockQty: null,
          attributes: { condicion: 'Usado', bateria: 96 },
          choices: [],
        },
        {
          id: 'cargador',
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
    expect(screen.getByRole('img', { name: 'THE BLACK SHEEP' })).toHaveAttribute(
      'src',
      '/placeholder.svg',
    );
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

  it('con un producto con foto, la tarjeta usa /img/<key>-480 con carga diferida (AC01 con foto)', async () => {
    const response = demoCatalogResponse();
    const body = await response.clone().json();
    body.products[0].image = {
      thumb: '/img/t/tenant/abc-480',
      full: '/img/t/tenant/abc-1200',
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderCatalogAt('demo');

    const image = await screen.findByRole('img', { name: 'Producto Demo' });
    expect(image).toHaveAttribute('src', '/img/t/tenant/abc-480');
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  function sectionTitles(): string[] {
    return screen
      .getAllByRole('heading', { level: 2 })
      .filter((heading) => heading.parentElement?.tagName === 'SECTION')
      .map((heading) => heading.textContent);
  }

  it('con miphone muestra secciones en orden iPhones → MacBooks → Accesorios (test de secciones)', async () => {
    vi.mocked(fetch).mockResolvedValue(miphoneCatalogResponse());

    renderCatalogAt('miphone');

    await screen.findByRole('button', { name: 'Accesorios' });
    expect(sectionTitles()).toEqual(['iPhones', 'MacBooks', 'Accesorios']);
  });

  it('el chip "Accesorios" deja solo esa sección y pone ?cat=accesorios (test de secciones)', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(miphoneCatalogResponse());

    const { router } = renderCatalogAt('miphone');

    await screen.findByRole('button', { name: 'Accesorios' });
    await user.click(screen.getByRole('button', { name: 'Accesorios' }));

    expect(await screen.findByText('Fundas Silicona case')).toBeInTheDocument();
    expect(sectionTitles()).toEqual(['Accesorios']);
    expect(router.state.location.search).toBe('?cat=accesorios');
  });

  it('con banned (una sola categoría) no hay chips (test de secciones)', async () => {
    vi.mocked(fetch).mockResolvedValue(bannedCatalogResponse());

    renderCatalogAt('banned');

    await screen.findByRole('button', { name: /soy mayor de 18/i });
    await userEvent.setup().click(screen.getByRole('button', { name: /soy mayor de 18/i }));

    await screen.findByText('THE BLACK SHEEP');
    expect(screen.queryByRole('button', { name: 'Todos' })).not.toBeInTheDocument();
  });

  it('la tarjeta de "Fundas Silicona case" muestra "2x $16.000" (test de nota de precio)', async () => {
    vi.mocked(fetch).mockResolvedValue(miphoneCatalogResponse());

    renderCatalogAt('miphone');

    expect(await screen.findByText('2x $16.000')).toBeInTheDocument();
  });

  it('la tarjeta del iPhone muestra 256GB, Natural, Usado y 87% (Apple AC01)', async () => {
    vi.mocked(fetch).mockResolvedValue(miphoneCatalogResponse());

    renderCatalogAt('miphone');

    await screen.findByRole('button', { name: 'iPhones' });
    expect(screen.getByText('256GB')).toBeInTheDocument();
    expect(screen.getByText('Natural')).toBeInTheDocument();
    expect(screen.getByText('Usado')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('USD 735')).toBeInTheDocument();
  });

  it('categoría iPhones + batería mín. 95% + precio máx. 700 deja solo dos productos (Apple AC03)', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(miphoneWithFiltersCatalogResponse());

    renderCatalogAt('miphone');

    await user.click(await screen.findByRole('button', { name: 'iPhones' }));
    await user.click(screen.getByRole('button', { name: /Filtros/ }));
    await user.selectOptions(screen.getByLabelText('Batería'), '95');
    await user.type(screen.getByLabelText('Precio máximo'), '700');
    await user.click(screen.getByRole('button', { name: /Ver \d+ resultados/ }));

    expect(screen.getByText('iPhone 15 Pro 128GB (Black) 100%')).toBeInTheDocument();
    expect(screen.getByText('iPhone 14 Pro 128GB (Black) 100% AS IS')).toBeInTheDocument();
    expect(screen.queryByText('iPhone 15 Pro Max 256GB (Natural) 87%')).not.toBeInTheDocument();
    expect(screen.queryByText('iPhone 13 128GB (Blue) 84%')).not.toBeInTheDocument();
    expect(screen.queryByText('iPhone 15 (White) 96%')).not.toBeInTheDocument();
    expect(screen.queryByText('iPhone 17 256GB (Sage)')).not.toBeInTheDocument();
  });

  it('sin resultados muestra el mensaje y "Limpiar filtros" restaura el catálogo sin parámetros (E17)', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(miphoneWithFiltersCatalogResponse());

    const { router } = renderCatalogAt('miphone');

    await user.click(await screen.findByRole('button', { name: 'iPhones' }));
    await user.click(screen.getByRole('button', { name: /Filtros/ }));
    await user.click(screen.getByRole('button', { name: 'Sellado' }));
    await user.selectOptions(screen.getByLabelText('Batería'), '90');
    await user.click(screen.getByRole('button', { name: /Ver \d+ resultados/ }));

    expect(
      await screen.findByText('No encontramos productos con esos filtros'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(await screen.findByText('Cargador completo certificado')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('el precio máximo en USD excluye el producto en ARS (E18)', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(miphoneWithFiltersCatalogResponse());

    renderCatalogAt('miphone');

    await screen.findByRole('button', { name: 'iPhones' });
    await user.click(screen.getByRole('button', { name: /Filtros/ }));
    await user.type(screen.getByLabelText('Precio máximo'), '700');
    await user.click(screen.getByRole('button', { name: /Ver \d+ resultados/ }));

    expect(screen.queryByText('Cargador completo certificado')).not.toBeInTheDocument();
  });

  it('visibilidad de controles: BANNED muestra buscador sin botón Filtros; miphone muestra ambos', async () => {
    const bannedManyProducts = await bannedCatalogResponse().clone().json();
    bannedManyProducts.products = Array.from({ length: 12 }, (_, index) => ({
      ...bannedManyProducts.products[0],
      id: `p${index}`,
      name: `Producto ${index}`,
    }));
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(bannedManyProducts), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderCatalogAt('banned');
    await screen.findByRole('button', { name: /soy mayor de 18/i });
    await userEvent.setup().click(screen.getByRole('button', { name: /soy mayor de 18/i }));

    expect(await screen.findByLabelText('Buscar…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Filtros/ })).not.toBeInTheDocument();

    vi.mocked(fetch).mockResolvedValue(miphoneWithFiltersCatalogResponse());
    renderCatalogAt('miphone');

    expect(await screen.findByLabelText('Buscar…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filtros/ })).toBeInTheDocument();
  });
});
