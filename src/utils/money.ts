import type { Language } from '@/i18n';
import { intlLocale } from './intl';

const THREE_DECIMALS = new Set(['KWD', 'BHD', 'OMR']);
const AMOUNT = /^(-?)(\d+)(?:\.(\d+))?$/;

export const currencyDecimals = (currency: string) => (THREE_DECIMALS.has(currency) ? 3 : 2);

// Amounts are decimal strings. Integers up to 15 digits are exact as numbers, so Intl groups them; longer ones fall back to a regex.
const MAX_SAFE_DIGITS = 15;

function group(integer: string, language: Language): string {
  if (integer.length > MAX_SAFE_DIGITS) return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return new Intl.NumberFormat(intlLocale(language), { useGrouping: true }).format(Number(integer));
}

// Never does float math on the fraction.
export function formatMoney(amount: string, currency: string, language: Language): string {
  const match = AMOUNT.exec(amount.trim());
  if (!match) return `${currency} ${amount}`;

  const [, sign, integer, fraction = ''] = match;
  const decimals = currencyDecimals(currency);
  const digits = fraction.slice(0, decimals).padEnd(decimals, '0');
  const whole = /^0*$/.test(digits);
  const grouped = group(integer, language);
  return `${currency} ${sign}${grouped}${whole ? '' : `.${digits}`}`;
}
