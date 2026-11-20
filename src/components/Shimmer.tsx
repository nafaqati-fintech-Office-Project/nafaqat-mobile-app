import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';

// A grey placeholder with a soft light that sweeps across it, for content that is still loading.
export function ShimmerBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const [width, setWidth] = useState(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.set(
      withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }), -1),
    );
    return () => cancelAnimation(sweep);
  }, [sweep]);

  const lightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -width + sweep.get() * width * 2 }],
  }));

  return (
    <View
      style={[styles.block, style]}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <Animated.View style={[styles.light, { width }, lightStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.skeleton, overflow: 'hidden' },
  light: { position: 'absolute', top: 0, bottom: 0, left: 0 },
});
