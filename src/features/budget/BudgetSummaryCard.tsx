import { StyleSheet, View } from 'react-native';

import { ProgressBar, TONE_COLORS } from './ProgressBar';
import type { Budget } from './types';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

export function BudgetSummaryCard({ budget }: { budget: Budget }) {
  const { language, t } = useLanguage();
  const over = budget.remaining.trim().startsWith('-');
  const money = (amount: string) => formatMoney(amount, budget.currency, language);
  const month = new Intl.DateTimeFormat(intlLocale(language), { month: 'long', year: 'numeric' }).format(
    budget.startDate,
  );

  return (
    <View style={styles.card}>
      <View style={styles.texts}>
        <AppText weight="bold" style={styles.title}>
          {t('budget.summary.monthly')}
        </AppText>
        <AppText style={styles.meta}>{month}</AppText>
      </View>
      <AppText style={styles.amounts}>
        <AppText weight="bold" style={styles.spent}>
          {money(budget.spent)}
        </AppText>
        {` ${t('budget.of')} ${money(budget.limit)}`}
      </AppText>
      <View style={styles.barRow}>
        <View style={styles.bar}>
          <ProgressBar percent={budget.percent} tone={budget.tone} />
        </View>
        <AppText weight="bold" style={styles.percent}>{`${budget.percent}%`}</AppText>
      </View>
      <AppText weight="medium" style={[styles.meta, over && { color: TONE_COLORS.over }]}>
        {`${money(over ? budget.remaining.trim().slice(1) : budget.remaining)} ${t(over ? 'budget.over' : 'budget.left')}`}
      </AppText>
      {budget.catchingUp && <AppText style={styles.meta}>{t('budget.catchingUp')}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.white, ...shadows.card },
  texts: { gap: spacing.xxs },
  title: { fontSize: fontSizes.md, color: colors.textPrimary },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  amounts: { fontSize: fontSizes.sm, color: colors.textSecondary },
  spent: { fontSize: fontSizes.lg, color: colors.textPrimary },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bar: { flex: 1 },
  percent: { fontSize: fontSizes.sm, color: colors.textPrimary },
});
