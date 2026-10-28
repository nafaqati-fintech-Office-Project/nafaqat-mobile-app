// Checked readers for response bodies: they throw on a shape the app does not expect.

// The gateway sends decimals as JSON numbers; accept numeric strings too.
export function num(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) throw new Error('Invalid number in response');
  return parsed;
}

export function str(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid text in response');
  return value;
}

export function obj(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid object in response');
  }
  return value as Record<string, unknown>;
}

// Amounts stay decimal strings; a JSON number is turned back into one without float math on the result.
export const decimal = (value: unknown): string => (typeof value === 'number' ? String(num(value)) : str(value));

// A calendar day (yyyy-MM-dd) as local midnight, so it never shifts a day in zones behind UTC.
export function localDate(value: unknown): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(value));
  if (!match) throw new Error('Invalid date in response');
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function arr(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Invalid list in response');
  return value;
}
