import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';

type Props = {
  title: string;
  onSeeAll: () => void;
  // Shown instead of the children: the section is empty or could not be loaded.
  note?: string | null;
  children?: ReactNode;
};

export function DashboardSection({ title, onSeeAll, note, children }: Props) {
  const { t } = useLanguage();
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText weight="semibold" style={styles.title} accessibilityRole="header">
          {title}
        </AppText>
        <Pressable onPress={onSeeAll} hitSlop={spacing.sm} accessibilityRole="link">
          <AppText weight="semibold" style={styles.seeAll}>
            {t('dashboard.seeAll')}
          </AppText>
        </Pressable>
      </View>
      {note ? <AppText style={styles.note}>{note}</AppText> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.xs,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { fontSize: fontSizes.md, color: colors.textPrimary },
  seeAll: { fontSize: fontSizes.sm, color: colors.primary },
  note: { fontSize: fontSizes.sm, color: colors.textSecondary, paddingVertical: spacing.md },
});
