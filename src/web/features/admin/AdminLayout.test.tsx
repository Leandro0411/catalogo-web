import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AdminLayout } from './AdminLayout';

function renderAdminLayout() {
  const router = createMemoryRouter(
    [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [{ index: true, element: <div>Contenido del panel</div> }],
      },
      { path: '/admin/login', element: <div>Login</div> },
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

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el logo del tenant en el header cuando hay logoUrl', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        username: 'leandro',
        tenant: {
          slug: 'banned',
          name: 'BANNED',
          primaryColor: '#D20A0A',
          logoUrl: '/img/t/tenant-banned/logo-1',
          currency: 'ARS',
        },
      }),
    );

    renderAdminLayout();

    expect(await screen.findByText('BANNED')).toBeInTheDocument();
    expect(screen.getByRole('presentation')).toHaveAttribute('src', '/img/t/tenant-banned/logo-1');
  });

  it('sin logoUrl no muestra ninguna imagen', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        username: 'ana',
        tenant: {
          slug: 'demo',
          name: 'Tienda Demo',
          primaryColor: '#2563EB',
          logoUrl: null,
          currency: 'ARS',
        },
      }),
    );

    renderAdminLayout();

    expect(await screen.findByText('Tienda Demo')).toBeInTheDocument();
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
  });
});
