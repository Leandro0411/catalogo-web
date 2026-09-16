import type { z } from 'zod';

export function parseJsonColumn<T>(text: string, schema: z.ZodType<T>, fallback: T): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    console.warn(JSON.stringify({ level: 'warn', msg: 'Columna JSON inválida', text }));
    return fallback;
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    console.warn(JSON.stringify({ level: 'warn', msg: 'Columna JSON no cumple el esquema', text }));
    return fallback;
  }

  return result.data;
}
