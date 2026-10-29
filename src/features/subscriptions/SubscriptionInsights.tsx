import { StyleSheet, View } from 'react-native';

import type { SubscriptionSummary } from './subscriptionMath';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

type Insight = { icon: IconName; tint: string; soft: string; text: string };

// Only insights the list itself supports; nothing about other users or usage the app cannot see.
export function SubscriptionInsights({ summary }: { summary: SubscriptionSummary }) {
  const { language, t } = useLanguage();
  const money = (amount: string) => formatMoney(amount, summary.currency, language);
  const insights: Insight[] = [];

  if (summary.unused.length > 0) {
    insights.push({
      icon: 'alert',
      tint: colors.orange,
      soft: colors.orangeSoft,
      text: t('subscriptions.insight.unused', { count: String(summary.unused.length) }),
    });
    insights.push({
      icon: 'savings',
      tint: colors.success,
      soft: colors.successSoft,
      text: t('subscriptions.insight.save', { amount: money(summary.unusedPerMonth) }),
    });
  }
  if (summary.biggest) {
    insights.push({
      icon: 'info',
      tint: colors.primary,
      soft: colors.primarySoft,
      text: t('subscriptions.insight.biggest', {
        name: summary.biggest.name,
        amount: formatMoney(summary.biggest.amount, summary.biggest.currency, language),
      }),
    });
  }
  if (insights.length === 0) return null;

  return (
    <View style={styles.card}>
      <AppText weight="bold" style={styles.title}>
        {t('subscriptions.insights')}
      </AppText>
      {insights.map((insight) => (
        <View key={insight.text} style={styles.row}>
          <View style={[styles.tile, { backgroundColor: insight.soft }]}>
            <Icon name={insight.icon} color={insight.tint} size={sizes.icon} />
          </View>
          <AppText style={styles.text}>{insight.text}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.xl, backgroundColor: colors.white, ...shadows.card },
  title: { fontSize: fontSizes.md, color: colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  tile: { width: sizes.chipIcon, height: sizes.chipIcon, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary },
});
