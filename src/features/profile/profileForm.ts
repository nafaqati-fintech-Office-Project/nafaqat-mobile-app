import type { NewPreferences, Preferences, Profile, ProfileUpdate } from './profileApi';
import { normalize } from '@/features/budget/budgetForm';

// The same choices as the web app's settings.
export const TIME_ZONES = [
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Kuwait',
  'Asia/Bahrain',
  'Asia/Qatar',
  'Asia/Muscat',
  'Asia/Karachi',
  'Europe/London',
  'America/New_York',
  'UTC',
];

export const MIN_CYCLE_DAY = 1;
export const MAX_CYCLE_DAY = 28;
export const DEFAULT_CYCLE_DAY = 1;

const COUNTRY_OF: Record<string, string> = { PKR: 'PK', SAR: 'SA', AED: 'AE', QAR: 'QA', KWD: 'KW', BHD: 'BH', OMR: 'OM' };
const DEFAULT_COUNTRY = 'PK';
const DEFAULT_THEME = 'light';

// The service's E.164 rule.
const PHONE = /^\+[1-9][0-9]{6,14}$/;

// Arabic digits and the usual separators are accepted while typing; the service stores only + and digits.
export const cleanPhone = (text: string) => normalize(text).replace(/[-()]/g, '');
export const isPhone = (text: string) => PHONE.test(text);

export type ProfileFields = Pick<Profile, 'firstName' | 'lastName' | 'phone'>;

export const sameProfile = (a: ProfileFields, b: ProfileFields) =>
  a.firstName === b.firstName && a.lastName === b.lastName && a.phone === b.phone;

// PUT merges: a missing field keeps its value, so an emptied one has to be named in clearFields.
export function profileBody({ firstName, lastName, phone }: ProfileFields): ProfileUpdate {
  const clearFields = [...(lastName ? [] : ['lastName']), ...(phone ? [] : ['phone'])];
  return {
    firstName,
    ...(lastName ? { lastName } : {}),
    ...(phone ? { phone } : {}),
    ...(clearFields.length > 0 ? { clearFields } : {}),
  };
}

export const samePreferences = (a: Preferences | null, b: Preferences) =>
  a?.currency === b.currency && a.timezone === b.timezone && a.budgetCycleDay === b.budgetCycleDay;

// The first save has to send every required field.
export const newPreferences = (values: Preferences, language: string): NewPreferences => ({
  ...values,
  language,
  country: COUNTRY_OF[values.currency] ?? DEFAULT_COUNTRY,
  theme: DEFAULT_THEME,
});
