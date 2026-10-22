import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { FeatureChip, type FeatureKey } from './FeatureChip';
import { Logo } from './Logo';
import { t } from '@/i18n';
import { colors, gradients, radius, shadows, sizes, spacing } from '@/theme';

type ChipPlacement = {
  feature: FeatureKey;
  top: DimensionValue;
  side: 'start' | 'end';
};

const CHIPS: ChipPlacement[] = [
  { feature: 'sms', top: '8%', side: 'start' },
  { feature: 'ai', top: '30%', side: 'end' },
  { feature: 'insights', top: '54%', side: 'start' },
  { feature: 'secure', top: '76%', side: 'end' },
];

const BARS: DimensionValue[] = ['80%', '55%', '70%'];

type Props = {
  highlighted: FeatureKey;
};

export function PhoneMockup({ highlighted }: Props) {
  return (
    <View style={styles.container} accessible accessibilityLabel={t('onboarding.phoneA11y')}>
      <View style={styles.phone}>
        <View style={styles.screen}>
          <View style={styles.notch} />
          <View style={styles.header}>
            <Logo size={sizes.logoMini} />
            <View style={[styles.line, styles.headerLine]} />
          </View>
          <LinearGradient colors={gradients.card} style={styles.card} />
          {BARS.map((width, i) => (
            <View key={i} style={[styles.line, { width }]} />
          ))}
          <View style={styles.tiles}>
            <View style={styles.tile} />
            <View style={styles.tile} />
          </View>
        </View>
      </View>
      {CHIPS.map(({ feature, top, side }) => (
        <FeatureChip
          key={feature}
          feature={feature}
          highlighted={feature === highlighted}
          style={[styles.chip, { top }, side === 'start' ? styles.start : styles.end]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    height: '92%',
    aspectRatio: 0.5,
    padding: spacing.sm,
    borderRadius: radius.phone,
    backgroundColor: colors.phoneFrame,
    ...shadows.card,
  },
  screen: {
    flex: 1,
    borderRadius: radius.xl,
    backgroundColor: colors.phoneScreen,
    padding: spacing.md,
    gap: spacing.md,
    overflow: 'hidden',
  },
  notch: {
    alignSelf: 'center',
    width: sizes.notchWidth,
    height: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.phoneFrame,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLine: {
    flex: 1,
  },
  card: {
    height: '22%',
    borderRadius: radius.md,
  },
  line: {
    height: sizes.skeletonLine,
    borderRadius: radius.pill,
    backgroundColor: colors.skeleton,
  },
  tiles: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  chip: {
    position: 'absolute',
  },
  start: {
    start: spacing.lg,
  },
  end: {
    end: spacing.lg,
  },
});
