import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';

type Props = {
  title: string;
  // Shown instead of the children: the section is empty or could not be loaded.
  note?: string | null;
  children?: ReactNode;
};

// A dashboard card with a title and no "See all" link.
export function InfoCard({ title, note, children }: Props) {
  return (
    <View style={styles.card}>
      <AppText weight="semibold" style={styles.title} accessibilityRole="header">
        {title}
      </AppText>
      {note ? <AppText style={styles.note}>{note}</AppText> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  title: { fontSize: fontSizes.md, color: colors.textPrimary },
  note: { fontSize: fontSizes.sm, color: colors.textSecondary, paddingVertical: spacing.md },
});
