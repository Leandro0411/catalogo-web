import { ZodError } from 'zod';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiErrorBody } from '../../shared/types/api.types';

export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof ApiError) {
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    return c.json(body, err.status);
  }

  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: err.issues },
    };
    return c.json(body, 400);
  }

  console.error(JSON.stringify({ level: 'error', msg: err.message }));
  const body: ApiErrorBody = { error: { code: 'INTERNAL_ERROR', message: 'Error interno' } };
  return c.json(body, 500);
}
