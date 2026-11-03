import { afterEach, describe, expect, it } from 'vitest';

import { reportFileName } from './exportReport';
import { buildReportHtml, escapeHtml } from './reportHtml';
import { mockReport } from './mock';
import { setCurrentLanguage } from '@/i18n';

afterEach(() => setCurrentLanguage('en'));

const report = () => mockReport({ year: 2026, month: 10 });
const at = new Date('2026-11-03T10:00:00Z');

describe('escapeHtml', () => {
  it('escapes the characters that could break out of the markup', () => {
    expect(escapeHtml(`<b>"A" & 'B'</b>`)).toBe('&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;');
  });
});

describe('buildReportHtml', () => {
  it('has the month, the currency and all six sections in English', () => {
    setCurrentLanguage('en');
    const html = buildReportHtml(report(), 'en', at);
    expect(html).toContain('lang="en" dir="ltr"');
    for (const text of [
      'October 2026',
      'SAR',
      'Monthly spending',
      'Category analysis',
      'Merchant analysis',
      'Lifestyle spending',
      'Savings',
      'Compared with last month',
    ]) {
      expect(html).toContain(text);
    }
    expect(html).toContain('Panda');
    expect(html).toContain('Groceries');
  });

  it('is right-to-left with Arabic text', () => {
    setCurrentLanguage('ar');
    const html = buildReportHtml(report(), 'ar', at);
    expect(html).toContain('lang="ar" dir="rtl"');
    expect(html).toContain('تحليل الفئات');
    expect(html).toContain('التقارير');
  });

  it('escapes merchant names', () => {
    setCurrentLanguage('en');
    const data = report();
    data.merchants = [{ merchant: '<script>alert(1)</script>', category: 'Groceries', count: 1, amount: '10.00' }];
    data.biggest = { merchant: '<img src=x>', category: 'Groceries', amount: '10.00' };
    const html = buildReportHtml(data, 'en', at);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('notes sections that could not be loaded and still builds the rest', () => {
    setCurrentLanguage('en');
    const data = { ...report(), merchantsState: 'unavailable' as const, merchants: [], trendState: 'unavailable' as const };
    const html = buildReportHtml(data, 'en', at);
    expect(html).toContain('Could not load merchants');
    expect(html).toContain('Could not load this right now');
    expect(html).toContain('Category analysis');
  });

  it('shows an empty month without breaking', () => {
    setCurrentLanguage('en');
    const empty = {
      ...report(),
      spent: '0.00',
      income: '0.00',
      net: '0.00',
      savingsRate: null,
      categories: [],
      lifestyle: report().lifestyle.map((s) => ({ ...s, amount: '0.00', percent: 0 })),
      merchants: [],
      trend: report().trend.map((m) => ({ ...m, amount: '0.00' })),
    };
    const html = buildReportHtml(empty, 'en', at);
    expect(html).toContain('No spending this month yet');
    expect(html).toContain('No income recorded this month');
  });
});

describe('reportFileName', () => {
  it('names the file after the month', () => {
    expect(reportFileName({ period: { year: 2026, month: 3 } })).toBe('Nafaqati-Report-2026-03.pdf');
    expect(reportFileName({ period: { year: 2026, month: 11 } })).toBe('Nafaqati-Report-2026-11.pdf');
  });
});
