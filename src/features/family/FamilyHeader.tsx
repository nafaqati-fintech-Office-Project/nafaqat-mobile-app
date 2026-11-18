import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { screenTitle } from '@/components/screenTitle';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  // Where "back" goes when there is nothing to go back to (a screen opened from a notification).
  fallback: '/family' | '/home';
  action?: { label: string; onPress: () => void };
};

export function FamilyHeader({ title, subtitle, fallback, action }: Props) {
  const { t, isRTL } = useLanguage();
  return (
    <>
    <View style={styles.header}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
        accessibilityRole="button"
        accessibilityLabel={t('budget.back')}
        style={styles.side}>
        {/* The chevron points right; flip it to point back in left-to-right layouts. */}
        <View style={!isRTL && styles.flip}>
          <Icon name="chevron" color={colors.textPrimary} size={sizes.iconLg} />
        </View>
      </Pressable>
      <View style={styles.titles}>
        <AppText weight="bold" style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </AppText>
      </View>
      {action && (
        <Pressable onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} style={styles.action}>
          <AppText weight="bold" style={styles.actionText}>
            {action.label}
          </AppText>
        </Pressable>
      )}
    </View>
      {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg },
  side: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  titles: { flex: 1 },
  title: { ...screenTitle },
  subtitle: { fontSize: fontSizes.xs, color: colors.textSecondary, paddingHorizontal: spacing.xl },
  action: {
    minHeight: sizes.touchMin - spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  actionText: { fontSize: fontSizes.sm, color: colors.white },
});
