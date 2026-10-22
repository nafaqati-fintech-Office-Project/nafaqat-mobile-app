import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '@/theme';

export function DashboardSkeleton() {
  return (
    <View
      style={styles.wrap}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.block, styles.card]} />
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.block, styles.stat]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  block: { backgroundColor: colors.skeleton, borderRadius: radius.xl },
  card: { height: sizes.chartHeight * 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexBasis: '47%', flexGrow: 1, height: sizes.iconTile * 2.5 },
});
