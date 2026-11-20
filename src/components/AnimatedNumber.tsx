import type { ComponentProps } from 'react';

import { AppText } from './AppText';
import { useCountUp } from '@/hooks/useCountUp';

type Props = Omit<ComponentProps<typeof AppText>, 'children'> & { value: number; suffix?: string };

// A whole number (a count, a percent) that rolls up from 0 to its value.
export function AnimatedNumber({ value, suffix = '', ...text }: Props) {
  const rolling = useCountUp(value);
  return <AppText {...text}>{`${Math.round(rolling)}${suffix}`}</AppText>;
}
