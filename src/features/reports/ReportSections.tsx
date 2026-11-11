import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { lifestyleGroup } from './reportBuilder';

import type { Change, LifestyleGroup, Report } from './types';
import { InfoCard } from '@/features/dashboard/InfoCard';
import { AppText } from '@/components/AppText';
import { barHeight } from '@/features/dashboard/barHeight';
import { ChangeChip } from '@/features/insights/ChangeChip';
import { MerchantRow } from '@/features/insights/MerchantRow';
import { categoryFromCode, categoryLabelKey } from '@/features/transactions/categoryDisplay';
import { categoryLook } from '@/features/transactions/categoryLook';
import { DrillPressable } from '@/features/transactions/DrillPressable';
import { canOpenCategory, monthsRange, type TransactionLink } from '@/features/transactions/transactionLinks';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { intlLocale, monthName } from '@/utils/intl';
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

// Links into the Transactions tab for the report's month (or another month: the comparison's previous one).
function useReportLinks(report: Report) {
  const { language } = useLanguage();
  return (label: string, extra: Partial<TransactionLink> = {}, year = report.period.year, month = report.period.month): TransactionLink => ({
    ...monthsRange(year, month),
    ...extra,
    title: `${label} · ${monthName(month, year, language)} ${year}`,
  });
}

// The month before the report's month.
const previousMonth = ({ year, month }: { year: number; month: number }) =>
  month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

const TRANSFERS = categoryFromCode('TRANSFERS') ?? 'Transfers';
const CASH = categoryFromCode('CASH_WITHDRAWALS') ?? 'Cash Withdrawals';
const LOANS = categoryFromCode('LOANS_EMI') ?? 'Loans/EMI';

function Line({ label, value, bold, link = null }: { label: string; value: string; bold?: boolean; link?: TransactionLink | null }) {
  return (
    <DrillPressable link={link} style={styles.line} label={`${label}, ${value}`}>
      <AppText style={styles.label}>{label}</AppText>
      <AppText weight={bold ? 'bold' : 'semibold'} style={styles.value}>
        {value}
      </AppText>
    </DrillPressable>
  );
}

// Monthly spending report: the month at a glance.
export function SummarySection({ report }: { report: Report }) {
  const { t, language } = useLanguage();
  const money = useMoney(report.currency);
  const month = `${monthName(report.period.month, report.period.year, language)} ${report.period.year}`;
  const { biggest } = report;
  const partial = report.merchantsState === 'ready' && report.merchantsTruncated;
  const link = useReportLinks(report);

  return (
    <InfoCard title={`${t('reports.summary')} · ${month}`}>
      <DrillPressable link={link(t('dashboard.totalSpending'), { type: 'expenses' })} label={`${t('dashboard.totalSpending')}, ${money(report.spent)}`}>
        <AppText weight="bold" style={styles.hero} numberOfLines={1} adjustsFontSizeToFit>
          {money(report.spent)}
        </AppText>
      </DrillPressable>
      <Line label={t('dashboard.income')} value={money(report.income)} link={link(t('dashboard.income'), { type: 'income' })} />
      <Line label={t('dashboard.net')} value={money(report.net)} link={link(t('dashboard.net'))} />
      <Line label={t('reports.avgDaily')} value={money(report.avgDaily)} link={link(t('reports.avgDaily'), { type: 'expenses' })} />
      {report.transactionCount !== null && (
        <Line
          label={t('reports.transactions')}
          value={String(report.transactionCount)}
          link={link(t('reports.transactions'), { type: 'expenses' })}
        />
      )}
      {biggest && (
        <Line
          label={`${t('reports.biggest')}${biggest.merchant ? ` (${biggest.merchant})` : ''}`}
          value={money(biggest.amount)}
          link={biggest.merchant ? link(biggest.merchant, { type: 'expenses', q: biggest.merchant }) : null}
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
  const link = useReportLinks(report);

  return (
    <InfoCard title={t('reports.categories')} note={report.categories.length === 0 ? t('insights.noCategories') : null}>
      {report.categories.map((item) => {
        const look = categoryLook(item.category);
        const key = categoryLabelKey(item.category);
        const name = key ? t(key) : item.category;
        return (
          <DrillPressable
            key={item.category}
            link={canOpenCategory(item.category) ? link(name, { type: 'expenses', category: item.category }) : null}
            style={styles.cat}
            label={`${name}, ${money(item.amount)}, ${item.percent}%`}>
            <View style={styles.line}>
              <AppText weight="semibold" style={styles.value} numberOfLines={1}>
                {name}
              </AppText>
              <AppText style={styles.label}>{`${money(item.amount)} · ${item.percent}%`}</AppText>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${item.percent}%`, backgroundColor: look.tint }]} />
            </View>
          </DrillPressable>
        );
      })}
    </InfoCard>
  );
}

// Merchant analysis: where the money went, by shop.
export function MerchantSection({ report }: { report: Report }) {
  const { t } = useLanguage();
  const link = useReportLinks(report);
  const note =
    report.merchantsState === 'unavailable'
      ? t('insights.merchantsUnavailable')
      : report.merchants.length === 0
        ? t('insights.noMerchants')
        : null;

  return (
    <InfoCard title={t('reports.merchants')} note={note}>
      {report.merchants.map((item, i) => (
        <MerchantRow
          key={item.merchant}
          item={item}
          rank={i + 1}
          currency={report.currency}
          link={link(item.merchant, { type: 'expenses', q: item.merchant })}
        />
      ))}
    </InfoCard>
  );
}

// Lifestyle spending: needs against wants.
export function LifestyleSection({ report }: { report: Report }) {
  const { t } = useLanguage();
  const money = useMoney(report.currency);
  const link = useReportLinks(report);
  // A group covers several categories and the list filters by one, so a group opens into its categories.
  const [open, setOpen] = useState<LifestyleGroup | null>(null);
  const empty = report.lifestyle.every((s) => s.percent === 0);
  const nameOf = (category: string) => {
    const key = categoryLabelKey(category);
    return key ? t(key) : category;
  };

  return (
    <InfoCard title={t('reports.lifestyleTitle')} note={empty ? t('insights.noCategories') : null}>
      <View style={styles.split}>
        {report.lifestyle
          .filter((s) => s.percent > 0)
          .map((s) => (
            <View key={s.group} style={{ flex: s.percent, backgroundColor: GROUP_COLOR[s.group] }} />
          ))}
      </View>
      {report.lifestyle.map((s) => {
        const members = report.categories.filter((c) => lifestyleGroup(c.category) === s.group && canOpenCategory(c.category));
        const expanded = open === s.group;
        return (
          <View key={s.group} style={styles.cat}>
            <Pressable
              onPress={() => setOpen(expanded ? null : s.group)}
              disabled={members.length === 0}
              accessibilityRole="button"
              accessibilityState={{ expanded, disabled: members.length === 0 }}
              accessibilityLabel={`${t(GROUP_LABEL[s.group])}, ${money(s.amount)}, ${s.percent}%`}
              style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
              <View style={styles.legend}>
                <View style={[styles.dot, { backgroundColor: GROUP_COLOR[s.group] }]} />
                <AppText style={styles.label}>{`${t(GROUP_LABEL[s.group])}${members.length > 0 ? (expanded ? ' ▴' : ' ▾') : ''}`}</AppText>
              </View>
              <AppText weight="semibold" style={styles.value}>{`${money(s.amount)} · ${s.percent}%`}</AppText>
            </Pressable>
            {expanded &&
              members.map((c) => (
                <Line
                  key={c.category}
                  label={`   ${nameOf(c.category)}`}
                  value={money(c.amount)}
                  link={link(nameOf(c.category), { type: 'expenses', category: c.category })}
                />
              ))}
          </View>
        );
      })}
    </InfoCard>
  );
}

// Savings: what was kept and how it compares with last month.
export function SavingsSection({ report }: { report: Report }) {
  const { t } = useLanguage();
  const money = useMoney(report.currency);
  const link = useReportLinks(report);
  const before = previousMonth(report.period);
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
      <DrillPressable link={link(t('reports.savings'))} style={styles.line} label={`${t('reports.savings')}, ${money(report.net)}`}>
        <AppText weight="bold" style={[styles.big, { color: kept ? colors.success : colors.danger }]}>
          {money(report.net)}
        </AppText>
        <ChangeChip percent={net.changePercent} goodWhen="up" />
      </DrillPressable>
      <AppText style={styles.note}>{summary}</AppText>
      <Line
        label={t('reports.lastMonth')}
        value={money(net.previous)}
        link={link(t('reports.savings'), {}, before.year, before.month)}
      />
    </InfoCard>
  );
}

type ChangeLineProps = {
  label: string;
  change: Change;
  goodWhen: 'up' | 'down';
  money: (v: string) => string;
  thisLink: TransactionLink;
  lastLink: TransactionLink;
};

function ChangeLine({ label, change, goodWhen, money, thisLink, lastLink }: ChangeLineProps) {
  const { t } = useLanguage();
  return (
    <View style={styles.cmp} accessible accessibilityLabel={`${label}, ${money(change.current)}, ${t('reports.lastMonth')} ${money(change.previous)}`}>
      <View style={styles.line}>
        <AppText weight="semibold" style={styles.value}>
          {label}
        </AppText>
        <ChangeChip percent={change.changePercent} goodWhen={goodWhen} />
      </View>
      <DrillPressable link={thisLink} style={styles.line} label={`${label}, ${t('reports.thisMonth')}, ${money(change.current)}`}>
        <AppText style={styles.label}>{t('reports.thisMonth')}</AppText>
        <AppText weight="semibold" style={styles.value}>
          {money(change.current)}
        </AppText>
      </DrillPressable>
      <DrillPressable link={lastLink} style={styles.line} label={`${label}, ${t('reports.lastMonth')}, ${money(change.previous)}`}>
        <AppText style={styles.label}>{t('reports.lastMonth')}</AppText>
        <AppText style={styles.label}>{money(change.previous)}</AppText>
      </DrillPressable>
    </View>
  );
}

// Comparative monthly report: this month against last, plus the last six months of spending.
export function ComparisonSection({ report }: { report: Report }) {
  const { t, language } = useLanguage();
  const money = useMoney(report.currency);
  const values = report.trend.map((m) => Number(m.amount)); // chart scale only, not money math
  const peak = Math.max(0, ...values);
  const link = useReportLinks(report);
  const before = previousMonth(report.period);
  const pair = (label: string, type?: TransactionLink['type']) => ({
    thisLink: link(label, { type }),
    lastLink: link(label, { type }, before.year, before.month),
  });

  return (
    <InfoCard title={t('reports.comparison')}>
      <ChangeLine
        label={t('dashboard.income')}
        change={report.comparison.income}
        goodWhen="up"
        money={money}
        {...pair(t('dashboard.income'), 'income')}
      />
      <ChangeLine
        label={t('dashboard.expenses')}
        change={report.comparison.expenses}
        goodWhen="down"
        money={money}
        {...pair(t('dashboard.expenses'), 'expenses')}
      />
      <ChangeLine label={t('dashboard.net')} change={report.comparison.net} goodWhen="up" money={money} {...pair(t('dashboard.net'))} />
      {report.trendState === 'unavailable' ? (
        <AppText style={styles.note}>{t('dashboard.sectionUnavailable')}</AppText>
      ) : (
        <View style={styles.trend}>
          {report.trend.map((m, i) => (
            <DrillPressable
              key={`${m.year}-${m.month}`}
              link={link(t('dashboard.expenses'), { type: 'expenses' }, m.year, m.month)}
              style={styles.trendCol}
              label={`${monthName(m.month, m.year, language)}, ${money(m.amount)}`}>
              <View style={styles.trendTrack}>
                <View style={[styles.trendBar, { height: barHeight(values[i], peak, sizes.chartHeight) }, values[i] <= 0 && styles.trendEmpty]} />
              </View>
              <AppText style={styles.note}>{monthName(m.month, m.year, language).slice(0, 3)}</AppText>
            </DrillPressable>
          ))}
        </View>
      )}
    </InfoCard>
  );
}

// Weekly report: everyday spending week by week, so a heavy week stands out.
export function WeeklySection({ report }: { report: Report }) {
  const { t, language } = useLanguage();
  const money = useMoney(report.currency);
  const month = monthsRange(report.period.year, report.period.month);
  // Only the week's days inside the month, the same days its total counts (yyyy-MM-dd compares as text).
  const weekRange = (start: string) => {
    const [y, m, d] = start.split('-').map(Number);
    const end = new Date(y, m - 1, d + 6);
    const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    return { from: start < month.from ? month.from : start, to: endKey > month.to ? month.to : endKey };
  };
  const peak = Math.max(0, ...report.weeks.map((w) => Number(w.amount))); // bar scale only, not money math
  const day = new Intl.DateTimeFormat(intlLocale(language), { month: 'short', day: 'numeric' });
  const label = (start: string) => {
    const [y, m, d] = start.split('-').map(Number);
    return day.format(new Date(y, m - 1, d));
  };
  const note =
    report.merchantsState === 'unavailable'
      ? t('insights.merchantsUnavailable')
      : report.weeks.length === 0
        ? t('reports.noWeeks')
        : null;

  return (
    <InfoCard title={t('reports.weekly')} note={note}>
      {report.weeks.map((w) => {
        const share = peak > 0 ? Math.max((Number(w.amount) / peak) * 100, 2) : 0;
        return (
          <DrillPressable
            key={w.start}
            link={{ type: 'expenses', ...weekRange(w.start), title: `${t('reports.weekly')} · ${label(w.start)}` }}
            style={styles.cat}
            label={`${label(w.start)}, ${money(w.amount)}`}>
            <View style={styles.line}>
              <AppText weight="semibold" style={styles.value}>{`${label(w.start)}${w.partial ? ' *' : ''}`}</AppText>
              <AppText style={styles.label}>{money(w.amount)}</AppText>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${share}%`, backgroundColor: colors.primary }]} />
            </View>
          </DrillPressable>
        );
      })}
      {report.weeks.some((w) => w.partial) && <AppText style={styles.note}>{`* ${t('reports.partialWeek')}`}</AppText>}
    </InfoCard>
  );
}

// How it was paid: everyday spending by card.
export function PaymentMethodsSection({ report }: { report: Report }) {
  const { t } = useLanguage();
  const money = useMoney(report.currency);
  const link = useReportLinks(report);
  const note =
    report.merchantsState === 'unavailable'
      ? t('insights.merchantsUnavailable')
      : report.paymentMethods.length === 0
        ? t('reports.noMethods')
        : null;

  return (
    <InfoCard title={t('reports.paymentMethods')} note={note}>
      {report.paymentMethods.map((m) => {
        const name = m.card ? `${t('reports.card')} ****${m.card}` : t('reports.otherMethod');
        return (
          <DrillPressable
            key={m.card ?? 'other'}
            link={m.card ? link(name, { type: 'expenses', card: m.card }) : null}
            style={styles.cat}
            label={`${name}, ${money(m.amount)}, ${m.percent}%`}>
            <View style={styles.line}>
              <AppText weight="semibold" style={styles.value} numberOfLines={1}>
                {name}
              </AppText>
              <AppText style={styles.label}>{`${money(m.amount)} · ${m.percent}%`}</AppText>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${m.percent}%`, backgroundColor: colors.violet }]} />
            </View>
          </DrillPressable>
        );
      })}
    </InfoCard>
  );
}

// Money movement: everyday spending, transfers to others and cash out, against what came in.
export function MovementSection({ report }: { report: Report }) {
  const { t } = useLanguage();
  const money = useMoney(report.currency);
  const { movement } = report;
  const link = useReportLinks(report);
  return (
    <InfoCard title={t('reports.movement')}>
      <Line label={t('reports.dayToDay')} value={money(movement.dayToDay)} link={link(t('reports.dayToDay'), { type: 'expenses' })} />
      <Line
        label={t('reports.transfersOut')}
        value={money(movement.transfers)}
        link={link(t('reports.transfersOut'), { type: 'expenses', category: TRANSFERS })}
      />
      <Line label={t('reports.cashOut')} value={money(movement.cash)} link={link(t('reports.cashOut'), { type: 'expenses', category: CASH })} />
      <Line label={t('reports.moneyIn')} value={money(movement.income)} bold link={link(t('reports.moneyIn'), { type: 'income' })} />
      <AppText style={styles.note}>{t('reports.movementNote')}</AppText>
    </InfoCard>
  );
}

// Debt report: what went to loans and instalments.
export function DebtSection({ report }: { report: Report }) {
  const { t } = useLanguage();
  const money = useMoney(report.currency);
  const { debt } = report;
  const none = Number(debt.loans) <= 0;
  const link = useReportLinks(report);
  return (
    <InfoCard title={t('reports.debt')} note={none ? t('reports.noDebt') : null}>
      <DrillPressable link={link(t('reports.debt'), { type: 'expenses', category: LOANS })} label={`${t('reports.debt')}, ${money(debt.loans)}`}>
        <AppText weight="bold" style={styles.big}>
          {money(debt.loans)}
        </AppText>
      </DrillPressable>
      {debt.percentOfIncome !== null && (
        <Line label={t('reports.debtOfIncome')} value={`${debt.percentOfIncome}%`} />
      )}
      <Line label={t('reports.debtOfSpending')} value={`${debt.percentOfSpending}%`} />
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
  pressed: { opacity: 0.6 },
});
