import { StyleSheet, View } from 'react-native';

import { priceWentUp, type SubscriptionView } from './subscriptionMath';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

type Insight = { key: string; icon: IconName; tint: string; soft: string; text: string };

// Only what the subscription service knows: price changes, charges that did not come, and the costliest one.
export function SubscriptionInsights({ view }: { view: SubscriptionView }) {
  const { language, t } = useLanguage();
  const money = (amount: string, currency: string) => formatMoney(amount, currency, language);
  const insights: Insight[] = [];

  for (const s of view.active.filter(priceWentUp)) {
    insights.push({
      key: `up-${s.id}`,
      icon: 'arrowUp',
      tint: colors.orange,
      soft: colors.orangeSoft,
      text: t('subscriptions.insight.priceUp', {
        name: s.name,
        from: money(s.previousAmount ?? s.amount, s.currency),
        to: money(s.amount, s.currency),
      }),
    });
  }
  for (const s of view.active.filter((x) => x.overdue)) {
    insights.push({
      key: `late-${s.id}`,
      icon: 'alert',
      tint: colors.danger,
      soft: colors.dangerSoft,
      text: t('subscriptions.insight.overdue', { name: s.name }),
    });
  }
  if (view.biggest) {
    insights.push({
      key: 'biggest',
      icon: 'info',
      tint: colors.primary,
      soft: colors.primarySoft,
      text: t('subscriptions.insight.biggest', {
        name: view.biggest.name,
        amount: money(view.biggest.monthlyCost, view.biggest.currency),
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
        <View key={insight.key} style={styles.row}>
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
