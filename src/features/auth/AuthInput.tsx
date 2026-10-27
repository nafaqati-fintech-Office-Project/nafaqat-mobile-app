import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontFamily, fontSizes, radius, sizes, spacing } from '@/theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  secure?: boolean;
  ref?: Ref<TextInputInstance>;
};

export function AuthInput({ label, error, secure = false, style, ref, ...rest }: Props) {
  const { t } = useLanguage();
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <AppText weight="medium" style={styles.label}>
        {label}
      </AppText>
      <View style={[styles.box, focused && styles.boxFocused, error ? styles.boxError : null]}>
        <TextInput
          {...rest}
          ref={ref}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={label}
          style={[styles.input, { fontFamily: fontFamily('regular') }, style]}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel={t(hidden ? 'login.showPassword' : 'login.hidePassword')}
            style={styles.toggle}>
            <Svg width={sizes.iconLg} height={sizes.iconLg} viewBox="0 0 24 24">
              <Path
                d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
                stroke={colors.textSecondary}
                strokeWidth={2}
                strokeLinejoin="round"
                fill="none"
              />
              <Circle cx={12} cy={12} r={3} stroke={colors.textSecondary} strokeWidth={2} fill="none" />
              {!hidden && (
                <Path d="M4 4l16 16" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" />
              )}
            </Svg>
          </Pressable>
        )}
      </View>
      {error ? (
        <AppText style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { fontSize: fontSizes.sm, color: colors.textPrimary },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: sizes.input,
    paddingStart: spacing.lg,
    paddingEnd: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  boxFocused: { borderColor: colors.primary },
  boxError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: fontSizes.md, color: colors.textPrimary, paddingVertical: spacing.md },
  toggle: { minWidth: sizes.touchMin, minHeight: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: fontSizes.xs, color: colors.danger },
});
