const pad = (n: number) => String(n).padStart(2, '0');

export const isoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// A UUID for one contribution, so repeating a request that timed out cannot add it twice. It only has to be
// unique among the user's contributions, so it needs no secure random source.
export const newRequestId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (slot) => {
    const digit = Math.floor(Math.random() * 16);
    return (slot === 'x' ? digit : (digit % 4) + 8).toString(16);
  });

// Target date choices, in months from today; null is "no date".
export const HORIZONS = [null, 6, 12, 24, 36, 60] as const;
export type Horizon = (typeof HORIZONS)[number];

// The same day N months ahead; a day the month does not have (31 in June) becomes its last day.
export function monthsAhead(months: number, today: Date = new Date()): Date {
  const last = new Date(today.getFullYear(), today.getMonth() + months + 1, 0).getDate();
  return new Date(today.getFullYear(), today.getMonth() + months, Math.min(today.getDate(), last));
}
