import { StyleSheet, View } from 'react-native';

import type { BudgetTone } from './budgetMath';
import { colors, radius } from '@/theme';

export const TONE_COLORS: Record<BudgetTone, string> = {
  ok: colors.success,
  warning: colors.orange,
  over: colors.danger,
};

const HEIGHT = 8;

// The fill stops at the end of the track; overspending shows through the colour, not the width.
export function ProgressBar({ percent, tone }: { percent: number; tone: BudgetTone }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.min(percent, 100)}%`, backgroundColor: TONE_COLORS[tone] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: HEIGHT, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
