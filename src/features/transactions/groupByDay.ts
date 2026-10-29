export type DaySection<T> = { key: string; date: Date; data: T[] };

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

// Rows must already be newest first; sections keep that order.
export function groupByDay<T extends { date: Date }>(rows: T[]): DaySection<T>[] {
  const sections: DaySection<T>[] = [];
  for (const row of rows) {
    const key = dayKey(row.date);
    const last = sections[sections.length - 1];
    if (last?.key === key) last.data.push(row);
    else sections.push({ key, date: row.date, data: [row] });
  }
  return sections;
}

export { daysAgo } from '@/utils/intl';
