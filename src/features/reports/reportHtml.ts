import type { LifestyleGroup, Report } from './types';
import { categoryLabelKey } from '@/features/transactions/categoryDisplay';
import { t, type Language, type TranslationKey } from '@/i18n';
import { intlLocale, monthName } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

const GROUP_COLOR: Record<LifestyleGroup, string> = { essentials: '#2563EB', lifestyle: '#8B5CF6', other: '#F59E0B' };
const GROUP_LABEL: Record<LifestyleGroup, TranslationKey> = {
  essentials: 'reports.essentials',
  lifestyle: 'reports.lifestyle',
  other: 'reports.other',
};

// Report data comes from the services (merchant names are free text), so it is escaped before it goes into HTML.
export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const STYLE = `
  @page { margin: 24px; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, 'Segoe UI', Arial, sans-serif; color: #0F172A; font-size: 13px; margin: 0; }
  h1 { font-size: 22px; margin: 0; }
  h2 { font-size: 15px; margin: 0 0 8px; }
  .sub { color: #64748B; font-size: 12px; margin-top: 4px; }
  section { margin-top: 18px; page-break-inside: avoid; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 6px 4px; border-bottom: 1px solid #EEF1F7; text-align: start; vertical-align: top; }
  th { color: #64748B; font-size: 11px; font-weight: 600; }
  .num { white-space: nowrap; font-weight: 600; }
  .hero { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
  .bar { height: 6px; border-radius: 3px; background: #E2E8F0; overflow: hidden; margin-top: 4px; }
  .bar span { display: block; height: 100%; border-radius: 3px; background: #2563EB; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .split { display: flex; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 8px; direction: ltr; }
  .split span { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-inline-end: 6px; }
  .good { color: #16A34A; } .bad { color: #DC2626; } .muted { color: #64748B; }
  .trend { display: flex; gap: 8px; align-items: flex-end; height: 100px; direction: ltr; margin-top: 8px; }
  .trend div { flex: 1; text-align: center; font-size: 10px; color: #64748B; }
  .trend i { display: block; margin: 0 auto 3px; width: 60%; background: #93B4F5; border-radius: 4px 4px 0 0; min-height: 2px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`;

export function buildReportHtml(report: Report, language: Language, generatedAt: Date = new Date()): string {
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const money = (value: string) => escapeHtml(formatMoney(value, report.currency, language));
  const month = `${monthName(report.period.month, report.period.year, language)} ${report.period.year}`;
  const generated = new Intl.DateTimeFormat(intlLocale(language), { dateStyle: 'medium' }).format(generatedAt);
  const categoryName = (category: string) => {
    const key = categoryLabelKey(category);
    return escapeHtml(key ? t(key) : category);
  };
  const change = (percent: number | null, lowerIsBetter = false) => {
    if (percent === null) return '<span class="muted">-</span>';
    if (percent === 0) return '<span class="muted">0%</span>';
    const good = (percent > 0) !== lowerIsBetter;
    return `<span class="${good ? 'good' : 'bad'}">${percent > 0 ? '▲' : '▼'} ${Math.abs(percent)}%</span>`;
  };
  const row = (label: string, value: string) => `<tr><td>${escapeHtml(label)}</td><td class="num">${value}</td></tr>`;

  const summary = [
    row(t('dashboard.income'), money(report.income)),
    row(t('dashboard.net'), money(report.net)),
    row(t('reports.avgDaily'), money(report.avgDaily)),
    ...(report.transactionCount !== null ? [row(t('reports.transactions'), String(report.transactionCount))] : []),
    ...(report.biggest
      ? [
          row(
            `${t('reports.biggest')}${report.biggest.merchant ? ` (${report.biggest.merchant})` : ''}`,
            money(report.biggest.amount),
          ),
        ]
      : []),
  ].join('');

  const categories = report.categories.length
    ? report.categories
        .map(
          (c) => `<tr><td>${categoryName(c.category)}<div class="bar"><span style="width:${c.percent}%"></span></div></td>
            <td class="num">${money(c.amount)} · ${c.percent}%</td></tr>`,
        )
        .join('')
    : `<tr><td class="muted">${escapeHtml(t('insights.noCategories'))}</td></tr>`;

  const merchants =
    report.merchantsState === 'unavailable'
      ? `<tr><td class="muted">${escapeHtml(t('insights.merchantsUnavailable'))}</td></tr>`
      : report.merchants.length
        ? report.merchants
            .map(
              (m, i) => `<tr><td>${i + 1}. ${escapeHtml(m.merchant)}<div class="muted">${categoryName(m.category)} · ${m.count} ${escapeHtml(t('insights.payments'))}</div></td>
                <td class="num">${money(m.amount)}</td></tr>`,
            )
            .join('')
        : `<tr><td class="muted">${escapeHtml(t('insights.noMerchants'))}</td></tr>`;

  const split = report.lifestyle
    .filter((s) => s.percent > 0)
    .map((s) => `<span style="flex:${s.percent};background:${GROUP_COLOR[s.group]}"></span>`)
    .join('');
  const lifestyle = report.lifestyle
    .map(
      (s) => `<tr><td><span class="dot" style="background:${GROUP_COLOR[s.group]}"></span>${escapeHtml(t(GROUP_LABEL[s.group]))}</td>
        <td class="num">${money(s.amount)} · ${s.percent}%</td></tr>`,
    )
    .join('');

  const kept = Number(report.net) >= 0;
  const savingsText =
    report.savingsRate === null
      ? t('dashboard.cashFlowNoIncome')
      : kept
        ? t('dashboard.cashFlowKept', { percent: String(report.savingsRate) })
        : t('dashboard.cashFlowOver', { percent: String(Math.abs(report.savingsRate)) });

  const { income, expenses, net } = report.comparison;
  const compare = (label: string, c: typeof income, lowerIsBetter = false) =>
    `<tr><th scope="row">${escapeHtml(label)}</th><td class="num">${money(c.current)}</td><td class="num">${money(c.previous)}</td><td>${change(c.changePercent, lowerIsBetter)}</td></tr>`;

  const peak = Math.max(0, ...report.trend.map((m) => Number(m.amount)));
  const trend =
    report.trendState === 'unavailable'
      ? `<p class="muted">${escapeHtml(t('dashboard.sectionUnavailable'))}</p>`
      : `<div class="trend">${report.trend
          .map((m) => {
            const value = Number(m.amount);
            const height = peak > 0 && value > 0 ? Math.max((value / peak) * 80, 3) : 2;
            return `<div title="${money(m.amount)}"><i style="height:${height}px"></i>${escapeHtml(monthName(m.month, m.year, language).slice(0, 3))}</div>`;
          })
          .join('')}</div>`;

  return `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${STYLE}</style></head>
<body>
  <h1>${escapeHtml(t('appName'))} · ${escapeHtml(t('reports.title'))}</h1>
  <div class="sub">${escapeHtml(month)} · ${escapeHtml(report.currency)} · ${escapeHtml(generated)}</div>

  <section><h2>${escapeHtml(t('reports.summary'))}</h2>
    <div class="hero">${money(report.spent)}</div><table>${summary}</table></section>
  <section><h2>${escapeHtml(t('reports.categories'))}</h2><table>${categories}</table></section>
  <section><h2>${escapeHtml(t('reports.merchants'))}</h2><table>${merchants}</table></section>
  <section><h2>${escapeHtml(t('reports.lifestyleTitle'))}</h2><div class="split">${split}</div><table>${lifestyle}</table></section>
  <section><h2>${escapeHtml(t('reports.savings'))}</h2>
    <div class="hero ${kept ? 'good' : 'bad'}">${money(report.net)}</div>
    <div class="muted">${escapeHtml(savingsText)}</div></section>
  <section><h2>${escapeHtml(t('reports.comparison'))}</h2>
    <table><thead><tr><th></th><th>${escapeHtml(t('reports.thisMonth'))}</th><th>${escapeHtml(t('reports.lastMonth'))}</th><th></th></tr></thead>
    <tbody>${compare(t('dashboard.income'), income)}${compare(t('dashboard.expenses'), expenses, true)}${compare(t('dashboard.net'), net)}</tbody></table>
    ${trend}</section>
</body></html>`;
}
