import type { AttributeDef } from '../types/catalog.types';

const PERCENT_UNIT = '%';
const TEXT_VALUE_MAX_LENGTH = 60;

export function formatAttributeValue(def: AttributeDef, value: string | number): string {
  if (def.type === 'number') {
    const formatted = Number(value).toLocaleString('es-AR');

    if (!def.unit) {
      return formatted;
    }

    return def.unit === PERCENT_UNIT ? `${formatted}${def.unit}` : `${formatted} ${def.unit}`;
  }

  return String(value);
}

export interface ValidateAttributesSuccess {
  ok: true;
  value: Record<string, string | number>;
}

export interface ValidateAttributesFailure {
  ok: false;
  errors: Record<string, string>;
}

export type ValidateAttributesResult = ValidateAttributesSuccess | ValidateAttributesFailure;

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

export function validateAttributes(
  schema: AttributeDef[],
  values: Record<string, unknown>,
): ValidateAttributesResult {
  const errors: Record<string, string> = {};
  const value: Record<string, string | number> = {};
  const schemaByKey = new Map(schema.map((def) => [def.key, def]));

  for (const key of Object.keys(values)) {
    if (!schemaByKey.has(key)) {
      errors[key] = 'Atributo desconocido';
    }
  }

  for (const def of schema) {
    const raw = values[def.key];

    if (isEmptyValue(raw)) {
      if (def.required) {
        errors[def.key] = 'Obligatorio';
      }
      continue;
    }

    if (def.type === 'number') {
      const numeric = typeof raw === 'number' ? raw : Number(raw);

      if (!Number.isFinite(numeric) || numeric < 0) {
        errors[def.key] = 'Debe ser un número';
        continue;
      }

      value[def.key] = numeric;
      continue;
    }

    if (def.type === 'enum') {
      const text = String(raw);

      if (!def.options?.includes(text)) {
        errors[def.key] = 'Valor no permitido';
        continue;
      }

      value[def.key] = text;
      continue;
    }

    value[def.key] = String(raw).trim().slice(0, TEXT_VALUE_MAX_LENGTH);
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value };
}
