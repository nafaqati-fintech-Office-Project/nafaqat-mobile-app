import type { ReactNode } from 'react';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

const STAGGER_MS = 60;
const MAX_STAGGER = 8;

// Fades and slides a card up when it first appears; `index` delays each card a little after the one before it.
export function FadeInCard({ index, children }: { index: number; children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, MAX_STAGGER) * STAGGER_MS)
        .duration(320)
        .reduceMotion(ReduceMotion.System)}>
      {children}
    </Animated.View>
  );
}
