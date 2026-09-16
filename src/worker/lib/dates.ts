const SQL_DATETIME_LENGTH = 19;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

export function toSqlDateTime(date: Date): string {
  return date.toISOString().slice(0, SQL_DATETIME_LENGTH).replace('T', ' ');
}

export function fromSqlDateTime(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MS_PER_MINUTE);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}
