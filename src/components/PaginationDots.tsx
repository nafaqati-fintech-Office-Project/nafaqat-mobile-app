import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '@/theme';

type Props = {
  count: number;
  activeIndex: number;
};

export function PaginationDots({ count, activeIndex }: Props) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 1, max: count, now: activeIndex + 1 }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === activeIndex && styles.active]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: sizes.dot,
    height: sizes.dot,
    borderRadius: radius.pill,
    backgroundColor: colors.dotInactive,
  },
  active: {
    width: sizes.dotActive,
    backgroundColor: colors.primary,
  },
});
