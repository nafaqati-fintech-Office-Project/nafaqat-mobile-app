import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, radius, spacing } from '@/theme';

const DOT = 7;

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 350 }), withTiming(0.3, { duration: 350 })), -1));
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function TypingIndicator() {
  const { t } = useLanguage();
  return (
    <View style={styles.bubble} accessibilityRole="progressbar" accessibilityLabel={t('assistant.typing')}>
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.textSecondary },
});
