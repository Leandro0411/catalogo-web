import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { LoginPage } from './LoginPage';

function renderLoginPage() {
  const router = createMemoryRouter(
    [
      { path: '/admin/login', element: <LoginPage /> },
      { path: '/admin', element: <div>Panel admin</div> },
    ],
    { initialEntries: ['/admin/login'] },
  );

  return render(<RouterProvider router={router} />);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function fillAndSubmit(username: string, password: string): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Usuario'), username);
  await user.type(screen.getByLabelText('Contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra "Usuario o contraseña incorrectos" con 401', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(
        jsonResponse(401, {
          error: { code: 'INVALID_CREDENTIALS', message: 'Usuario o contraseña incorrectos' },
        }),
      ),
    );

    renderLoginPage();
    await fillAndSubmit('leandro', 'mal');

    expect(await screen.findByText('Usuario o contraseña incorrectos')).toBeInTheDocument();
  });

  it('muestra el mensaje de bloqueo con 423', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(
        jsonResponse(423, {
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Demasiados intentos. Probá de nuevo en unos minutos.',
          },
        }),
      ),
    );

    renderLoginPage();
    await fillAndSubmit('leandro', 'clave');

    expect(
      await screen.findByText('Demasiados intentos. Probá de nuevo en unos minutos.'),
    ).toBeInTheDocument();
  });

  it('muestra un error genérico ante una falla de red', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.reject(new Error('network down')));

    renderLoginPage();
    await fillAndSubmit('leandro', 'clave');

    expect(await screen.findByText('No pudimos conectar. Probá de nuevo.')).toBeInTheDocument();
  });

  it('navega a /admin cuando el login responde 204', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));

    renderLoginPage();
    await fillAndSubmit('leandro', 'clave');

    expect(await screen.findByText('Panel admin')).toBeInTheDocument();
  });
});
