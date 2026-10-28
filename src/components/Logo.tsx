import { useId } from 'react';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors, gradients } from '@/theme';
import { svgA11y } from './svgA11y';

type Props = {
  size: number;
  accessibilityLabel?: string;
};

export function Logo({ size, accessibilityLabel }: Props) {
  const gradientId = `logo${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [start, end] = gradients.logo;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      {...svgA11y(accessibilityLabel)}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={start} />
          <Stop offset="1" stopColor={end} />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" rx="26" fill={`url(#${gradientId})`} />
      <Path
        d="M32 72V28l36 44V28"
        stroke={colors.white}
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
