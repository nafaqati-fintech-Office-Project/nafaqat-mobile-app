import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { screenTitle } from '@/components/screenTitle';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

export function TransactionsHeader({
  onAdd,
  onScan,
  scanning,
}: {
  onAdd: () => void;
  onScan: () => void;
  scanning: boolean;
}) {
  const { t } = useLanguage();

  return (
    <View style={styles.row}>
      <AppText weight="bold" style={styles.title}>
        {t('tabs.transactions')}
      </AppText>
      <Pressable
        onPress={onScan}
        disabled={scanning}
        accessibilityRole="button"
        accessibilityLabel={t('receipts.scanLabel')}
        accessibilityState={{ disabled: scanning, busy: scanning }}
        style={styles.scan}>
        <AppText weight="bold" style={styles.scanText}>
          {scanning ? t('receipts.reading') : t('receipts.scan')}
        </AppText>
      </Pressable>
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={t('transactions.cash.title')}
        style={styles.add}>
        <AppText weight="bold" style={styles.addText}>
          {`+ ${t('transactions.cash.add')}`}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: sizes.touchMin },
  title: { flex: 1, ...screenTitle },
  add: {
    minHeight: sizes.touchMin - spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  addText: { fontSize: fontSizes.sm, color: colors.white },
  scan: {
    minHeight: sizes.touchMin - spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  scanText: { fontSize: fontSizes.sm, color: colors.primary },
});
