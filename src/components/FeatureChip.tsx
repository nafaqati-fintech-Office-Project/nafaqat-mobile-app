import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from './AppText';
import { t } from '@/i18n';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';

export type FeatureKey = 'sms' | 'ai' | 'insights' | 'secure';

const ICONS: Record<FeatureKey, string> = {
  sms: 'M4 5h16v11H9l-5 4z',
  ai: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z',
  insights: 'M5 20V12M12 20V5M19 20v-7',
  secure: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4',
};

type Props = {
  feature: FeatureKey;
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FeatureChip({ feature, highlighted = false, style }: Props) {
  const iconColor = highlighted ? colors.white : colors.primary;

  return (
    <View style={[styles.chip, highlighted && styles.chipActive, style]}>
      <View style={[styles.iconWrap, highlighted && styles.iconWrapActive]}>
        <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24">
          <Path
            d={ICONS[feature]}
            stroke={iconColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </View>
      <AppText
        weight="semibold"
        style={[styles.label, highlighted && styles.labelActive]}
        numberOfLines={1}>
        {t(`features.${feature}`)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingStart: spacing.sm,
    paddingEnd: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  chipActive: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.06 }],
  },
  iconWrap: {
    width: sizes.chipIcon,
    height: sizes.chipIcon,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconWrapActive: {
    backgroundColor: colors.primaryPressed,
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
  },
  labelActive: {
    color: colors.white,
  },
});
