import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

type Props = { onPress: () => void; loading?: boolean };

// "Continue with Google" with Google's four-colour G, under "or" so it reads as the other way in.
export function GoogleButton({ onPress, loading = false }: Props) {
  const { t } = useLanguage();

  return (
    <View style={styles.wrap}>
      <View style={styles.orRow}>
        <View style={styles.line} />
        <AppText style={styles.or}>{t('google.or')}</AppText>
        <View style={styles.line} />
      </View>
      <Pressable
        onPress={onPress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={t('google.continue')}
        accessibilityState={{ disabled: loading, busy: loading }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={styles.content}>
            <Svg width={sizes.iconLg} height={sizes.iconLg} viewBox="0 0 48 48">
              <Path
                fill="#4285F4"
                d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
              />
              <Path
                fill="#34A853"
                d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
              />
              <Path
                fill="#FBBC05"
                d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
              />
              <Path
                fill="#EA4335"
                d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
              />
            </Svg>
            <AppText weight="semibold" style={styles.label}>
              {t('google.continue')}
            </AppText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { fontSize: fontSizes.sm, color: colors.textSecondary },
  button: {
    minHeight: sizes.button,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  pressed: { opacity: 0.6 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { fontSize: fontSizes.md, color: colors.textPrimary },
});
