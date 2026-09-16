import type { ApiErrorBody } from '../../shared/types/api.types';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'same-origin' });

  if (!response.ok) {
    const body = (await response.json()) as ApiErrorBody;
    throw new HttpError(response.status, body.error.code, body.error.message, body.error.details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
