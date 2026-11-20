import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  // Pixels (axis "height") or a percent of the parent (axis "width"). Starts at 0 and grows; when `to` changes it slides.
  to: number;
  axis: 'height' | 'width';
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

// A bar of a chart that grows to its size instead of appearing at it.
export function GrowBar({ to, axis, delay = 0, style }: Props) {
  const size = useSharedValue(0);

  useEffect(() => {
    size.set(
      withDelay(
        delay,
        withTiming(to, { duration: 650, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }),
      ),
    );
  }, [to, delay, size]);

  const grown = useAnimatedStyle(() =>
    axis === 'height' ? { height: size.get() } : { width: `${size.get()}%` as `${number}%` },
  );

  return <Animated.View style={[style, grown]} />;
}
