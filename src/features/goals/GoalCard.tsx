import { Pressable, StyleSheet, View } from 'react-native';

import { monthlyNeeded, progressOf } from './goalMath';
import type { Goal, GoalStatus } from './types';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import type { Language, TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

const BAR_HEIGHT = 8;

export const STATUS_TONE: Record<GoalStatus, { tint: string; soft: string }> = {
  ACTIVE: { tint: colors.primary, soft: colors.primarySoft },
  COMPLETED: { tint: colors.success, soft: colors.successSoft },
  CANCELLED: { tint: colors.textSecondary, soft: colors.border },
};

export const STATUS_LABEL: Record<GoalStatus, TranslationKey> = {
  ACTIVE: 'goals.status.active',
  COMPLETED: 'goals.status.completed',
  CANCELLED: 'goals.status.cancelled',
};

export const formatDay = (date: Date, language: Language) =>
  new Intl.DateTimeFormat(intlLocale(language), { day: 'numeric', month: 'short', year: 'numeric' }).format(date);

export function GoalProgressBar({ percent, status }: { percent: number; status: GoalStatus }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: STATUS_TONE[status].tint }]} />
    </View>
  );
}

export function GoalCard({ goal, onPress }: { goal: Goal; onPress: () => void }) {
  const { language, t } = useLanguage();
  const money = (amount: string) => formatMoney(amount, goal.currency, language);
  const percent = progressOf(goal);
  const tone = STATUS_TONE[goal.status];
  const perMonth = monthlyNeeded(goal);

  const footer =
    goal.status !== 'ACTIVE'
      ? t(STATUS_LABEL[goal.status])
      : percent >= 100
        ? t('goals.reached')
        : perMonth
          ? t('goals.perMonth', { amount: money(perMonth) })
          : goal.targetDate
            ? t('goals.datePassed')
            : t('goals.noDate');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${goal.name}, ${t('goals.progressA11y', { percent: String(percent) })}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={[styles.tile, { backgroundColor: tone.soft }]}>
          <Icon name={goal.status === 'COMPLETED' ? 'check' : 'savings'} color={tone.tint} size={sizes.iconLg} />
        </View>
        <View style={styles.texts}>
          <AppText weight="semibold" style={styles.name} numberOfLines={1}>
            {goal.name}
          </AppText>
          <AppText style={styles.meta} numberOfLines={1}>
            {`${money(goal.savedAmount)} / ${money(goal.targetAmount)}`}
          </AppText>
        </View>
        <AppText weight="bold" style={[styles.percent, { color: tone.tint }]}>
          {`${percent}%`}
        </AppText>
      </View>
      <GoalProgressBar percent={percent} status={goal.status} />
      <View style={styles.bottom}>
        <AppText style={styles.meta} numberOfLines={1}>
          {footer}
        </AppText>
        {goal.targetDate && (
          <AppText style={styles.meta}>{t('goals.by', { date: formatDay(goal.targetDate, language) })}</AppText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.xl, backgroundColor: colors.white, ...shadows.card },
  pressed: { opacity: 0.7 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tile: { width: sizes.iconTile, height: sizes.iconTile, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: spacing.xxs },
  name: { fontSize: fontSizes.md, color: colors.textPrimary },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  percent: { fontSize: fontSizes.md },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  track: { height: BAR_HEIGHT, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
