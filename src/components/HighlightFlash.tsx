import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { colors, radius, spacing } from '@/theme';

const IN_MS = 250;
const HOLD_MS = 1200;
const OUT_MS = 1500;

// Keys already shown: a list recreates rows as they scroll back into view, and that must not flash again.
const played = new Set<string>();

type Props = { flashKey: string | null; inset?: number; borderRadius?: number };

// A soft tint behind a row that appears and fades away, to show which item the user was sent to.
// Render it as the row's first child; each flashKey plays once, null shows nothing. The system's
// reduce-motion setting makes the fades instant.
export function HighlightFlash({ flashKey, inset = spacing.sm, borderRadius = radius.md }: Props) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!flashKey || played.has(flashKey)) return;
    played.add(flashKey);
    opacity.set(
      withSequence(withTiming(1, { duration: IN_MS }), withDelay(HOLD_MS, withTiming(0, { duration: OUT_MS }))),
    );
  }, [flashKey, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  if (!flashKey) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.tint, { top: -inset / 2, bottom: -inset / 2, start: -inset, end: -inset, borderRadius }, style]}
    />
  );
}

const styles = StyleSheet.create({
  tint: { position: 'absolute', backgroundColor: colors.primarySoft },
});
