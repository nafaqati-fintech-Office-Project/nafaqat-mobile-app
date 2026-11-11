// The days a cash expense can be dated: today and the six before it, newest first (local midnight).
// Never a future day, which the transaction service would accept but the totals should not show.
export function recentDays(now: Date, count = 7): Date[] {
  return Array.from({ length: count }, (_, ago) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago));
}

// The days to pick from, plus the receipt's own day when it is older than those (never a future day).
export function daysWithReceiptDay(days: Date[], receiptDay: Date | null, now: Date): Date[] {
  if (!receiptDay || receiptDay.getTime() > now.getTime()) return days;
  const known = days.some((day) => day.getTime() === receiptDay.getTime());
  return known ? days : [...days, receiptDay];
}

// When it happened: now for today, otherwise midday of that day, so no time zone moves it to another date.
export function expenseInstant(day: Date, now: Date): string {
  const today = day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth() && day.getDate() === now.getDate();
  const at = today ? now : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12);
  return at.toISOString();
}
