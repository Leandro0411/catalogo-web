export function sqlValue(value: string | number | boolean | null): string {
  if (value === null) {
    return 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Valor numérico no finito: ${value}`);
    }
    return String(value);
  }

  return `'${value.replace(/'/g, "''")}'`;
}

export function sqlJson(value: unknown): string {
  return sqlValue(JSON.stringify(value));
}
