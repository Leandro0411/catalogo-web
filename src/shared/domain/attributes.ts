import type { AttributeDef } from '../types/catalog.types';

const PERCENT_UNIT = '%';

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
