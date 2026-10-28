import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { svgA11y } from './svgA11y';

const PATHS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  transactions: 'M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3',
  insights: 'M5 20V12M12 20V5M19 20v-7',
  assistant:
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  bell: 'M6 9a6 6 0 0112 0c0 6 3 7 3 7H3s3-1 3-7M10 20a2 2 0 004 0',
  budget: 'M21 12A9 9 0 1112 3v9zM15 3.5A9 9 0 0120.5 9H15z',
  subscriptions: 'M4 12a8 8 0 0114-5.3M20 4v4h-4M20 12a8 8 0 01-14 5.3M4 20v-4h4',
  savings:
    'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v10M15 9.5c0-1-1.3-1.5-3-1.5s-3 .8-3 2 1.3 1.6 3 2 3 .8 3 2-1.3 2-3 2-3-.5-3-1.5',
  sms: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
  chevron: 'M9 6l6 6-6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
} as const;

export type IconName = keyof typeof PATHS;

type Props = { name: IconName; color: ColorValue; size: number; strokeWidth?: number };

export function Icon({ name, color, size, strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...svgA11y()}>
      <Path
        d={PATHS[name]}
        stroke={color}
        strokeWidth={name === 'more' ? 3 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
