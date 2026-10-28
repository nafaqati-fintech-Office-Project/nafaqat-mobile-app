import { Pressable, StyleSheet, View } from 'react-native';

import type { TransactionFilter } from './transactionsApi';
import { AppText } from '@/components/AppText';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';

const FILTERS: { value: TransactionFilter; label: TranslationKey }[] = [
  { value: 'all', label: 'transactions.filter.all' },
  { value: 'expenses', label: 'transactions.filter.expenses' },
  { value: 'income', label: 'transactions.filter.income' },
];

type Props = { value: TransactionFilter; onChange: (filter: TransactionFilter) => void };

export function FilterTabs({ value, onChange }: Props) {
  const { t } = useLanguage();

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {FILTERS.map((filter) => {
        const active = filter.value === value;
        return (
          <Pressable
            key={filter.value}
            onPress={() => onChange(filter.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.pill, active && styles.pillActive]}>
            <AppText weight="medium" style={[styles.label, active && styles.labelActive]}>
              {t(filter.label)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: fontSizes.sm, color: colors.textPrimary },
  labelActive: { color: colors.white },
});
