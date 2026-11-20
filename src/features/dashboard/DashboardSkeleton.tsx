import { StyleSheet, View } from 'react-native';

import { ShimmerBlock } from '@/components/Shimmer';
import { radius, sizes, spacing } from '@/theme';

export function DashboardSkeleton() {
  return (
    <View
      style={styles.wrap}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <ShimmerBlock style={styles.card} />
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <ShimmerBlock key={i} style={styles.stat} />
        ))}
      </View>
      <ShimmerBlock style={styles.card} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  card: { height: sizes.chartHeight * 2, borderRadius: radius.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexBasis: '47%', flexGrow: 1, height: sizes.iconTile * 2.5, borderRadius: radius.xl },
});
