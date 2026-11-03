import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';

type Props = {
  title: string;
  // Shown instead of the children: the section is empty or could not be loaded.
  note?: string | null;
  // An optional link in the title row, such as "Reports".
  action?: { label: string; onPress: () => void };
  children?: ReactNode;
};

// A dashboard card with a title and, if given, one link.
export function InfoCard({ title, note, action, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText weight="semibold" style={styles.title} accessibilityRole="header">
          {title}
        </AppText>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={spacing.sm} accessibilityRole="link">
            <AppText weight="semibold" style={styles.action}>
              {action.label}
            </AppText>
          </Pressable>
        )}
      </View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { flexShrink: 1, fontSize: fontSizes.md, color: colors.textPrimary },
  action: { fontSize: fontSizes.sm, color: colors.primary },
  note: { fontSize: fontSizes.sm, color: colors.textSecondary, paddingVertical: spacing.md },
});
