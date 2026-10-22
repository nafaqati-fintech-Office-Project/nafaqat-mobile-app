import { Text, type TextProps } from 'react-native';

import { fontFamily, type FontWeight } from '@/theme';

type Props = TextProps & { weight?: FontWeight };

export function AppText({ weight = 'regular', style, ...rest }: Props) {
  return <Text {...rest} style={[{ fontFamily: fontFamily(weight) }, style]} />;
}
