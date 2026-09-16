import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { TenantLayout } from './TenantLayout';

function renderAt(slug: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/:slug',
        element: <TenantLayout />,
        children: [{ index: true, element: <div>Catálogo en preparación</div> }],
      },
    ],
    { initialEntries: [`/${slug}`] },
  );

  return render(<RouterProvider router={router} />);
}

describe('TenantLayout', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('muestra la marca del tenant tras aceptar el aviso +18 (BANNED)', async () => {
    const user = userEvent.setup();
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
            ageGate: true,
          },
          categories: [],
          products: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderAt('banned');

    await user.click(await screen.findByRole('button', { name: /soy mayor de 18/i }));

    expect(await screen.findByText('BANNED')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('BANNED'));
  });

  it('muestra "Catálogo no encontrado" cuando el tenant no existe (E01)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 'TENANT_NOT_FOUND', message: 'Catálogo no encontrado' } }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderAt('no-existe');

    expect(await screen.findByText('Catálogo no encontrado')).toBeInTheDocument();
  });
});
