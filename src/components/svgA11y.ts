import { Platform } from 'react-native';

// Accessibility props for an <Svg>. On web react-native-svg passes unknown props straight to the DOM
// <svg>, which rejects `accessible`, so the browser gets role and aria-* instead.
export function svgA11y(label?: string) {
  if (Platform.OS === 'web') {
    return label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const };
  }
  return label ? { accessible: true, accessibilityLabel: label } : { accessible: false };
}
