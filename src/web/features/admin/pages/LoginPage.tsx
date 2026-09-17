import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { login } from '../../../api/admin.api';
import { HttpError } from '../../../api/http';

const UNAUTHORIZED_STATUS = 401;
const LOCKED_STATUS = 423;

const INPUT_CLASS =
  'rounded-md border border-gray-300 px-3 py-2.5 text-base text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900';

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    login(username, password)
      .then(() => {
        navigate('/admin');
      })
      .catch((caught: unknown) => {
        if (caught instanceof HttpError && caught.status === UNAUTHORIZED_STATUS) {
          setError('Usuario o contraseña incorrectos');
        } else if (caught instanceof HttpError && caught.status === LOCKED_STATUS) {
          setError('Demasiados intentos. Probá de nuevo en unos minutos.');
        } else {
          setError('No pudimos conectar. Probá de nuevo.');
        }
        setSubmitting(false);
      });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-bold text-gray-900">
          Panel de administración
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Usuario
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoCapitalize="none"
              required
              className={INPUT_CLASS}
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-gray-900 px-4 py-2.5 text-base font-medium text-white disabled:opacity-40"
          >
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
