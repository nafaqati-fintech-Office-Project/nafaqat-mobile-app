import type { ComponentProps } from 'react';

import { AppText } from './AppText';
import { useCountUp } from '@/hooks/useCountUp';
import { useLanguage } from '@/i18n/LanguageProvider';
import { currencyDecimals, formatMoney } from '@/utils/money';

type Props = Omit<ComponentProps<typeof AppText>, 'children'> & { amount: string; currency: string };

// An amount that rolls up to its value. The final text is always the exact formatted string, never the animated float.
export function AnimatedMoney({ amount, currency, ...text }: Props) {
  const { language } = useLanguage();
  const target = Number(amount);
  const rolling = useCountUp(target);
  const done = !Number.isFinite(target) || Math.abs(rolling - target) < 0.005;
  const shown = done ? amount : rolling.toFixed(currencyDecimals(currency));
  return <AppText {...text}>{formatMoney(shown, currency, language)}</AppText>;
}
