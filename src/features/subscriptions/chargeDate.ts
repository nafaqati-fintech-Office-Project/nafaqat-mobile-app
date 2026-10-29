const pad = (n: number) => String(n).padStart(2, '0');

// The most recent date (today or earlier) that falls on this day of the month, as yyyy-MM-dd; a day the
// month does not have (31 in April) becomes its last day.
export function lastChargeDate(day: number, today: Date = new Date()): string {
  const clamp = (year: number, month: number) => Math.min(day, new Date(year, month + 1, 0).getDate());
  let year = today.getFullYear();
  let month = today.getMonth();
  if (clamp(year, month) > today.getDate()) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }
  return `${year}-${pad(month + 1)}-${pad(clamp(year, month))}`;
}

// A typed day of the month (1 to 31, Arabic digits too), or null.
export function readDay(text: string): number | null {
  const digits = text.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  if (!/^\d{1,2}$/.test(digits)) return null;
  const value = Number(digits);
  return value >= 1 && value <= 31 ? value : null;
}
