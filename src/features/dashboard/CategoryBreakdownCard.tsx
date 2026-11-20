import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DashboardSection } from './DashboardSection';
import { dashboardPeriod } from './drill';
import type { CategoryShare, DashboardData } from './types';
import { AnimatedMoney } from '@/components/AnimatedMoney';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { AppText } from '@/components/AppText';
import { GrowBar } from '@/components/GrowBar';
import { Icon } from '@/components/Icon';
import { categoryLabelKey } from '@/features/transactions/categoryDisplay';
import { DrillPressable } from '@/features/transactions/DrillPressable';
import { canOpenCategory, type TransactionLink } from '@/features/transactions/transactionLinks';
import { categoryLook } from '@/features/transactions/categoryLook';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

const BAR_HEIGHT = 6;

function CategoryRow({ item, currency, period, index }: { item: CategoryShare; currency: string; period: { title: string; from: string; to: string }; index: number }) {
  const { language, t } = useLanguage();
  const look = categoryLook(item.category);
  const labelKey = categoryLabelKey(item.category);
  const name = labelKey ? t(labelKey) : item.category;
  const money = formatMoney(item.amount, currency, language);

  return (
    <DrillPressable
      link={
        canOpenCategory(item.category)
          ? ({ type: 'expenses', category: item.category, from: period.from, to: period.to, title: `${name} · ${period.title}` } satisfies TransactionLink)
          : null
      }
      style={styles.row}
      label={`${name}, ${money}, ${item.percent}%`}>
      <View style={[styles.tile, { backgroundColor: look.tintSoft }]}>
        <Icon name={look.icon} color={look.tint} size={sizes.iconLg} />
      </View>
      <View style={styles.texts}>
        <View style={styles.line}>
          <AppText weight="semibold" style={styles.name} numberOfLines={1}>
            {name}
          </AppText>
          <AnimatedMoney amount={item.amount} currency={currency} weight="bold" style={styles.amount} />
        </View>
        <View style={styles.line}>
          <View style={styles.track}>
            <GrowBar axis="width" to={item.percent} delay={index * 70} style={[styles.fill, { backgroundColor: look.tint }]} />
          </View>
          <AnimatedNumber value={item.percent} suffix="%" style={styles.percent} />
        </View>
      </View>
    </DrillPressable>
  );
}

export function CategoryBreakdownCard({ data }: { data: DashboardData }) {
  const { t, language } = useLanguage();
  const period = dashboardPeriod(data, t, language);
  const note =
    data.categoriesState === 'unavailable'
      ? t('dashboard.sectionUnavailable')
      : data.categories.length === 0
        ? t('dashboard.noSpendingMonth')
        : null;

  return (
    <DashboardSection title={t('dashboard.byCategory')} onSeeAll={() => router.navigate('/insights')} note={note}>
      {data.categories.map((item, index) => (
        <CategoryRow key={item.category} item={item} currency={data.currency} period={period} index={index} />
      ))}
    </DashboardSection>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  tile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary },
  amount: { fontSize: fontSizes.sm, color: colors.textPrimary },
  track: { flex: 1, height: BAR_HEIGHT, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  percent: { fontSize: fontSizes.xs, color: colors.textSecondary },
});
