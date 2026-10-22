import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';

const DURATION_MS = 3000;

let show: ((message: string) => void) | null = null;

export const showToast = (message: string) => show?.(message);

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const { bottom } = useSafeAreaInsets();

  useEffect(() => {
    show = setMessage;
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), DURATION_MS);
    return () => clearTimeout(id);
  }, [message]);

  if (!message) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: bottom + spacing.xl }]}>
      <View style={styles.toast} accessibilityLiveRegion="polite">
        <AppText weight="medium" style={styles.text}>
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', start: spacing.xl, end: spacing.xl, alignItems: 'center' },
  toast: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.textPrimary,
    ...shadows.card,
  },
  text: { color: colors.white, fontSize: fontSizes.sm },
});
