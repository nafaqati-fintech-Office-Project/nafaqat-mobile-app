import { ActivityIndicator, I18nManager, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from './AppText';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  showArrow?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  accessibilityLabel,
  loading = false,
  disabled = false,
  showArrow = false,
}: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        inactive && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <View style={styles.content}>
          <AppText weight="semibold" style={styles.label}>
            {label}
          </AppText>
          {showArrow && (
            <Svg
              width={sizes.icon}
              height={sizes.icon}
              viewBox="0 0 24 24"
              style={I18nManager.isRTL && styles.flip}>
              <Path
                d="M5 12h14M13 6l6 6-6 6"
                stroke={colors.white}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: sizes.button,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    ...shadows.button,
  },
  pressed: {
    backgroundColor: colors.primaryPressed,
  },
  disabled: {
    backgroundColor: colors.primaryDisabled,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.white,
    fontSize: fontSizes.md,
  },
  flip: {
    transform: [{ scaleX: -1 }],
  },
});
