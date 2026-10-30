import { codeForCategory } from '@/features/transactions/categoryDisplay';
import { currencyDecimals } from '@/utils/money';

// The budget service's currencies (Currencies.supported()).
export const BUDGET_CURRENCIES = ['PKR', 'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR'] as const;
export type BudgetCurrency = (typeof BUDGET_CURRENCIES)[number];
export const isBudgetCurrency = (value: unknown): value is BudgetCurrency =>
  typeof value === 'string' && (BUDGET_CURRENCIES as readonly string[]).includes(value);

// Arabic-Indic (٠-٩) and Persian (۰-۹) digits, and a comma or Arabic decimal mark, as typed on Arabic keyboards.
export function normalize(text: string): string {
  return text
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫,]/g, '.')
    .replace(/[\s٬]/g, '');
}

export type AmountInput = { kind: 'empty' } | { kind: 'invalid' } | { kind: 'ok'; amount: string; minor: number };

// A typed amount as a decimal string and in minor units (fils, paisa), so sums never use float math.
// More than 12 whole digits is refused: the service's columns are smaller, and it keeps sums exact.
export function readAmount(text: string, currency: string): AmountInput {
  const value = normalize(text);
  if (!value) return { kind: 'empty' };
  const decimals = currencyDecimals(currency);
  const match = /^(\d{1,12})(?:\.(\d*))?$/.exec(value);
  if (!match || (match[2] ?? '').length > decimals) return { kind: 'invalid' };
  const whole = match[1].replace(/^0+(?=\d)/, '');
  const fraction = (match[2] ?? '').padEnd(decimals, '0');
  const minor = Number(whole) * 10 ** decimals + Number(fraction || '0');
  if (minor <= 0) return { kind: 'invalid' };
  return { kind: 'ok', amount: fraction ? `${whole}.${fraction}` : whole, minor };
}

export type BudgetLimits = {
  totalLimit: number;
  categoryLimits: { category: string; limitAmount: number }[];
};

export type FormCheck = {
  totalError: 'required' | 'invalid' | null;
  // Category names whose limit cannot be read.
  invalidCategories: string[];
  // Sum of the category limits that could be read, in minor units, against the total.
  allocatedMinor: number;
  totalMinor: number;
  overTotal: boolean;
  // Ready to send when there is no error.
  body: BudgetLimits | null;
};

// Checks the form as the budget service would: a total above 0, each limit within the currency's decimals,
// and the category limits together not above the total. Empty category fields mean "no limit".
export function checkBudgetForm(total: string, limits: Record<string, string>, currency: string): FormCheck {
  const totalInput = readAmount(total, currency);
  const totalMinor = totalInput.kind === 'ok' ? totalInput.minor : 0;
  const invalidCategories: string[] = [];
  const categoryLimits: BudgetLimits['categoryLimits'] = [];
  let allocatedMinor = 0;

  for (const [category, text] of Object.entries(limits)) {
    const input = readAmount(text, currency);
    if (input.kind === 'empty') continue;
    const code = codeForCategory(category);
    if (input.kind === 'invalid' || !code) {
      invalidCategories.push(category);
      continue;
    }
    allocatedMinor += input.minor;
    categoryLimits.push({ category: code, limitAmount: Number(input.amount) });
  }

  const totalError = totalInput.kind === 'empty' ? 'required' : totalInput.kind === 'invalid' ? 'invalid' : null;
  const overTotal = totalInput.kind === 'ok' && allocatedMinor > totalMinor;
  const ok = totalInput.kind === 'ok' && invalidCategories.length === 0 && !overTotal;
  return {
    totalError,
    invalidCategories,
    allocatedMinor,
    totalMinor,
    overTotal,
    body: ok ? { totalLimit: Number(totalInput.amount), categoryLimits } : null,
  };
}

// Minor units back to a decimal string, for showing sums.
export function fromMinor(minor: number, currency: string): string {
  const decimals = currencyDecimals(currency);
  const sign = minor < 0 ? '-' : '';
  const digits = String(Math.abs(minor)).padStart(decimals + 1, '0');
  return `${sign}${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
}
