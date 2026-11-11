import type { Report } from './types';
import { categoryLabelKey } from '@/features/transactions/categoryDisplay';
import { t } from '@/i18n';

// The byte order mark tells Excel the file is UTF-8, so Arabic text is read correctly.
const BOM = String.fromCharCode(0xfeff);

// A cell that holds a comma, a quote or a line break is wrapped in quotes. A cell that starts with = + - or @ would
// be run as a formula by Excel, and merchant names are free text, so it gets a leading apostrophe.
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

// The month's spending rows as a CSV that opens in Excel (the byte order mark makes Arabic text read correctly).
export function buildReportCsv(report: Report): string {
  const categoryName = (category: string) => {
    const key = categoryLabelKey(category);
    return key ? t(key) : category;
  };
  const header = [
    t('reports.csv.date'),
    t('reports.csv.merchant'),
    t('reports.csv.description'),
    t('reports.csv.category'),
    t('reports.csv.amount'),
    t('reports.csv.currency'),
  ];
  const lines = report.rows.map((r) =>
    [r.date.slice(0, 16).replace('T', ' '), r.merchant, r.description, categoryName(r.category), r.amount, report.currency]
      .map(csvCell)
      .join(','),
  );
  return `${BOM}${[header.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`;
}

export const reportCsvFileName = ({ period }: Pick<Report, 'period'>): string =>
  `Nafaqati-Report-${period.year}-${String(period.month).padStart(2, '0')}.csv`;
