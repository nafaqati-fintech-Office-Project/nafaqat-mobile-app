import { StyleSheet, View } from 'react-native';

import type { Change, LifestyleGroup, Report } from './types';
import { InfoCard } from '@/features/dashboard/InfoCard';
import { AppText } from '@/components/AppText';
import { barHeight } from '@/features/dashboard/barHeight';
import { ChangeChip } from '@/features/insights/ChangeChip';
import { MerchantRow } from '@/features/insights/MerchantRow';
import { categoryLabelKey } from '@/features/transactions/categoryDisplay';
import { categoryLook } from '@/features/transactions/categoryLook';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { monthName } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

const GROUP_COLOR: Record<LifestyleGroup, string> = {
  essentials: colors.primary,
  lifestyle: colors.violet,
  other: colors.orange,
};
const GROUP_LABEL: Record<LifestyleGroup, TranslationKey> = {
  essentials: 'reports.essentials',
  lifestyle: 'reports.lifestyle',
  other: 'reports.other',
};

function useMoney(currency: string) {
  const { language } = useLanguage();
  return (value: string) => formatMoney(value, currency, language);
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.line} accessible accessibilityLabel={`${label}, ${value}`}>
      <AppText style={styles.label}>{label}</AppText>
      <AppText weight={bold ? 'bold' : 'semibold'} style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

// Monthly spending report: the month at a glance.
export function SummarySection({ report }: { report: Report }) {
  const { t, language } = useLanguage();
  const money = useMoney(report.currency);
  const month = `${monthName(report.period.month, report.period.year, language)} ${report.period.year}`;
  const { biggest } = report;
  const partial = report.merchantsState === 'ready' && report.merchantsTruncated;

  return (
    <InfoCard title={`${t('reports.summary')} · ${month}`}>
      <AppText weight="bold" style={styles.hero} numberOfLines={1} adjustsFontSizeToFit>
        {money(report.spent)}
      </AppText>
      <Line label={t('dashboard.income')} value={money(report.income)} />
      <Line label={t('dashboard.net')} value={money(report.net)} />
      <Line label={t('reports.avgDaily')} value={money(report.avgDaily)} />
      {report.transactionCount !== null && (
        <Line label={t('reports.transactions')} value={String(report.transactionCount)} />
      )}
      {biggest && (
        <Line
          label={`${t('reports.biggest')}${biggest.merchant ? ` (${biggest.merchant})` : ''}`}
          value={money(biggest.amount)}
        />
      )}
      {partial && <AppText style={styles.note}>{t('insights.merchantsPartial')}</AppText>}
    </InfoCard>
  );
}

// Category analysis: every category with its amount and share.
export function CategorySection({ report }: { report: Report }) {
  const { t } = useLanguage();
  const money = useMoney(report.currency);

  return (
    <InfoCard title={t('reports.categories')} note={report.categories.length === 0 ? t('insights.noCategories') : null}>
      {report.categories.map((item) => {
        const look = categoryLook(item.category);
        const key = categoryLabelKey(item.category);
        const name = key ? t(key) : item.category;
        return (
          <View key={item.category} style={styles.cat} accessible accessibilityLabel={`${name}, ${money(item.amount)}, ${item.percent}%`}>
            <View style={styles.line}>
              <AppText weight="semibold" style={styles.value} numberOfLines={1}>
                {name}
              </AppText>
              <AppText style={styles.label}>{`${money(item.amount)} · ${item.percent}%`}</AppText>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${item.percent}%`, backgroundColor: look.tint }]} />
            </View>
          </View>
        );
      })}
    </InfoCard>
  );
}

// Merchant analysis: where the money went, by shop.
export function MerchantSection({ report }: { report: Report }) {
  const { t } = useLanguage();
  const note =
    report.merchantsState === 'unavailable'
      ? t('insights.merchantsUnavailable')
      : report.merchants.length === 0
        ? t('insights.noMerchants')
        : null;

  return (
    <InfoCard title={t('reports.merchants')} note={note}>
      {report.merchants.map((item, i) => (
        <MerchantRow key={item.merchant} item={item} rank={i + 1} currency={report.currency} />
      ))}
    </InfoCard>
  );
}

// Lifestyle spending: needs against wants.
export function LifestyleSection({ report }: { report: Report }) {
  const { t } = useLanguage();
  const money = useMoney(report.currency);
  const empty = report.lifestyle.every((s) => s.percent === 0);

  return (
    <InfoCard title={t('reports.lifestyleTitle')} note={empty ? t('insights.noCategories') : null}>
      <View style={styles.split}>
        {report.lifestyle
          .filter((s) => s.percent > 0)
          .map((s) => (
            <View key={s.group} style={{ flex: s.percent, backgroundColor: GROUP_COLOR[s.group] }} />
          ))}
      </View>
      {report.lifestyle.map((s) => (
        <View key={s.group} style={styles.line} accessible accessibilityLabel={`${t(GROUP_LABEL[s.group])}, ${money(s.amount)}, ${s.percent}%`}>
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: GROUP_COLOR[s.group] }]} />
            <AppText style={styles.label}>{t(GROUP_LABEL[s.group])}</AppText>
          </View>
          <AppText weight="semibold" style={styles.value}>{`${money(s.amount)} · ${s.percent}%`}</AppText>
        </View>
      ))}
    </InfoCard>
  );
}

// Savings: what was kept and how it compares with last month.
export function SavingsSection({ report }: { report: Report }) {
  const { t } = useLanguage();
  const money = useMoney(report.currency);
  const { net } = report.comparison;
  const kept = Number(report.net) >= 0;
  const summary =
    report.savingsRate === null
      ? t('dashboard.cashFlowNoIncome')
      : kept
        ? t('dashboard.cashFlowKept').replace('{percent}', String(report.savingsRate))
        : t('dashboard.cashFlowOver').replace('{percent}', String(Math.abs(report.savingsRate)));

  return (
    <InfoCard title={t('reports.savings')}>
      <View style={styles.line}>
        <AppText weight="bold" style={[styles.big, { color: kept ? colors.success : colors.danger }]}>
          {money(report.net)}
        </AppText>
        <ChangeChip percent={net.changePercent} goodWhen="up" />
      </View>
      <AppText style={styles.note}>{summary}</AppText>
      <Line label={t('reports.lastMonth')} value={money(net.previous)} />
    </InfoCard>
  );
}

function ChangeLine({ label, change, goodWhen, money }: { label: string; change: Change; goodWhen: 'up' | 'down'; money: (v: string) => string }) {
  const { t } = useLanguage();
  return (
    <View style={styles.cmp} accessible accessibilityLabel={`${label}, ${money(change.current)}, ${t('reports.lastMonth')} ${money(change.previous)}`}>
      <View style={styles.line}>
        <AppText weight="semibold" style={styles.value}>
          {label}
        </AppText>
        <ChangeChip percent={change.changePercent} goodWhen={goodWhen} />
      </View>
      <View style={styles.line}>
        <AppText style={styles.label}>{t('reports.thisMonth')}</AppText>
        <AppText weight="semibold" style={styles.value}>
          {money(change.current)}
        </AppText>
      </View>
      <View style={styles.line}>
        <AppText style={styles.label}>{t('reports.lastMonth')}</AppText>
        <AppText style={styles.label}>{money(change.previous)}</AppText>
      </View>
    </View>
  );
}

// Comparative monthly report: this month against last, plus the last six months of spending.
export function ComparisonSection({ report }: { report: Report }) {
  const { t, language } = useLanguage();
  const money = useMoney(report.currency);
  const values = report.trend.map((m) => Number(m.amount)); // chart scale only, not money math
  const peak = Math.max(0, ...values);

  return (
    <InfoCard title={t('reports.comparison')}>
      <ChangeLine label={t('dashboard.income')} change={report.comparison.income} goodWhen="up" money={money} />
      <ChangeLine label={t('dashboard.expenses')} change={report.comparison.expenses} goodWhen="down" money={money} />
      <ChangeLine label={t('dashboard.net')} change={report.comparison.net} goodWhen="up" money={money} />
      {report.trendState === 'unavailable' ? (
        <AppText style={styles.note}>{t('dashboard.sectionUnavailable')}</AppText>
      ) : (
        <View style={styles.trend}>
          {report.trend.map((m, i) => (
            <View key={`${m.year}-${m.month}`} style={styles.trendCol} accessible accessibilityLabel={`${monthName(m.month, m.year, language)}, ${money(m.amount)}`}>
              <View style={styles.trendTrack}>
                <View style={[styles.trendBar, { height: barHeight(values[i], peak, sizes.chartHeight) }, values[i] <= 0 && styles.trendEmpty]} />
              </View>
              <AppText style={styles.note}>{monthName(m.month, m.year, language).slice(0, 3)}</AppText>
            </View>
          ))}
        </View>
      )}
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  label: { fontSize: fontSizes.sm, color: colors.textSecondary },
  value: { flexShrink: 1, fontSize: fontSizes.sm, color: colors.textPrimary },
  note: { fontSize: fontSizes.xs, color: colors.textSecondary },
  hero: { fontSize: fontSizes.xxl, color: colors.textPrimary },
  big: { fontSize: fontSizes.xl },
  cat: { gap: spacing.xs },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  split: { flexDirection: 'row', height: 14, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.border },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: sizes.dot, height: sizes.dot, borderRadius: radius.pill },
  cmp: { gap: spacing.xs, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  trend: { flexDirection: 'row', gap: spacing.sm },
  trendCol: { flex: 1, alignItems: 'center', gap: spacing.xs },
  trendTrack: { height: sizes.chartHeight, justifyContent: 'flex-end', alignSelf: 'stretch', alignItems: 'center' },
  trendBar: { width: '60%', borderRadius: radius.sm, backgroundColor: colors.primaryDisabled },
  trendEmpty: { backgroundColor: colors.border },
});
