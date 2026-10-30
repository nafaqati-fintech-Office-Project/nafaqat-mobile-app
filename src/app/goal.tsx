import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { formatDay, GoalProgressBar, STATUS_LABEL, STATUS_TONE } from '@/features/goals/GoalCard';
import { can, monthlyNeeded, progressOf, remainingOf } from '@/features/goals/goalMath';
import { changeStatus, deleteGoal, goalProblem } from '@/features/goals/goalsApi';
import { useGoal } from '@/features/goals/useGoals';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

type Action = 'complete' | 'reopen' | 'cancel' | 'delete';

const DONE: Record<Action, TranslationKey> = {
  complete: 'goals.completedDone',
  reopen: 'goals.reopenedDone',
  cancel: 'goals.cancelledDone',
  delete: 'goals.deletedDone',
};

export default function GoalRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, t, isRTL } = useLanguage();
  const { goal, contributions, status, refreshing, refresh, retry, reload } = useGoal(id);
  const [busy, setBusy] = useState<Action | null>(null);

  // Coming back from adding money or editing shows the change.
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) void reload();
      focused.current = true;
    }, [reload]),
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace('/goals'));

  const perform = async (action: Action) => {
    if (!goal) return;
    setBusy(action);
    try {
      if (action === 'delete') await deleteGoal(goal.id);
      else await changeStatus(goal.id, action);
      showToast(t(DONE[action], { name: goal.name }));
      if (action === 'delete') close();
      else await reload();
    } catch (error) {
      const problem = goalProblem(error);
      showToast(t(`goals.problem.${problem}`));
      if (problem === 'notFound') close();
      else await reload();
    } finally {
      setBusy(null);
    }
  };

  const confirm = (action: 'cancel' | 'delete') =>
    Alert.alert(t(`goals.${action}Title`), t(`goals.${action}Body`), [
      { text: t('notifications.cancel'), style: 'cancel' },
      { text: t(`goals.${action}`), style: 'destructive', onPress: () => void perform(action) },
    ]);

  const header = (
    <View style={styles.header}>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('budget.back')} style={styles.side}>
        {/* The chevron points right; flip it to point back in left-to-right layouts. */}
        <View style={!isRTL && styles.flip}>
          <Icon name="chevron" color={colors.textPrimary} size={sizes.iconLg} />
        </View>
      </Pressable>
      <AppText weight="bold" style={styles.title} numberOfLines={1} accessibilityRole="header">
        {goal?.name ?? t('goals.title')}
      </AppText>
      {goal && can.edit(goal.status) ? (
        <Pressable
          onPress={() => router.push({ pathname: '/goal-edit', params: { id: goal.id } })}
          accessibilityRole="button"
          accessibilityLabel={t('goals.editTitle')}
          style={styles.side}>
          <Icon name="pencil" color={colors.textPrimary} size={sizes.icon} />
        </Pressable>
      ) : (
        <View style={styles.side} />
      )}
    </View>
  );

  if (status !== 'ready' || !goal) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        {header}
        {status === 'loading' ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : (
          <View style={styles.message}>
            <AppText weight="medium" style={styles.messageTitle}>
              {t('goals.loadError')}
            </AppText>
            <PrimaryButton label={t('budget.retry')} onPress={retry} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const money = (amount: string) => formatMoney(amount, goal.currency, language);
  const percent = progressOf(goal);
  const tone = STATUS_TONE[goal.status];
  const perMonth = monthlyNeeded(goal);
  const date = (value: Date) => formatDay(value, language);

  const stats: { label: TranslationKey; value: string }[] = [
    { label: 'goals.remaining', value: money(remainingOf(goal)) },
    { label: 'goals.targetDate', value: goal.targetDate ? date(goal.targetDate) : t('goals.noDateShort') },
    ...(perMonth ? [{ label: 'goals.monthly' as const, value: money(perMonth) }] : []),
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.badge, { backgroundColor: tone.soft }]}>
              <AppText weight="semibold" style={[styles.badgeText, { color: tone.tint }]}>
                {t(STATUS_LABEL[goal.status])}
              </AppText>
            </View>
            <AppText weight="bold" style={[styles.percent, { color: tone.tint }]}>
              {`${percent}%`}
            </AppText>
          </View>
          <AppText weight="bold" style={styles.saved}>
            {money(goal.savedAmount)}
          </AppText>
          <AppText style={styles.meta}>{t('goals.savedOf', { amount: money(goal.targetAmount) })}</AppText>
          <GoalProgressBar percent={percent} status={goal.status} />
          <View style={styles.stats}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.stat}>
                <AppText style={styles.meta}>{t(stat.label)}</AppText>
                <AppText weight="semibold" style={styles.statValue}>
                  {stat.value}
                </AppText>
              </View>
            ))}
          </View>
          {goal.description ? <AppText style={styles.description}>{goal.description}</AppText> : null}
        </View>

        {can.complete(goal) && (
          <View style={styles.reached}>
            <AppText weight="semibold" style={styles.reachedText}>
              {t('goals.reachedBody')}
            </AppText>
            <PrimaryButton label={t('goals.complete')} onPress={() => void perform('complete')} loading={busy === 'complete'} />
          </View>
        )}

        {can.contribute(goal.status) && (
          <PrimaryButton
            label={t('goals.addMoney')}
            onPress={() => router.push({ pathname: '/goal-contribute', params: { id: goal.id } })}
            disabled={busy !== null}
          />
        )}

        <View style={styles.actions}>
          {can.reopen(goal.status) && (
            <SecondaryAction label={t('goals.reopen')} busy={busy === 'reopen'} onPress={() => void perform('reopen')} />
          )}
          {can.cancel(goal.status) && (
            <SecondaryAction label={t('goals.cancel')} busy={busy === 'cancel'} onPress={() => confirm('cancel')} />
          )}
          <SecondaryAction label={t('goals.delete')} danger busy={busy === 'delete'} onPress={() => confirm('delete')} />
        </View>

        <View style={styles.card}>
          <AppText weight="bold" style={styles.sectionTitle}>
            {t('goals.history')}
          </AppText>
          {contributions.length === 0 ? (
            <AppText style={styles.meta}>{t('goals.historyEmpty')}</AppText>
          ) : (
            contributions.map((c, index) => (
              <View key={c.id} style={[styles.entry, index > 0 && styles.divider]}>
                <View style={styles.entryTexts}>
                  <AppText weight="medium" style={styles.entryNote} numberOfLines={1}>
                    {c.note ?? t('goals.contribution')}
                  </AppText>
                  <AppText style={styles.meta}>{date(c.createdAt)}</AppText>
                </View>
                <AppText weight="bold" style={styles.entryAmount}>
                  {`+ ${money(c.amount)}`}
                </AppText>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SecondaryAction({ label, onPress, busy, danger = false }: { label: string; onPress: () => void; busy: boolean; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <AppText weight="semibold" style={[styles.secondaryText, danger && styles.danger]}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg },
  side: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  title: { flex: 1, textAlign: 'center', fontSize: fontSizes.lg, color: colors.textPrimary },
  spinner: { marginTop: spacing.xxxl },
  message: { gap: spacing.lg, alignItems: 'center', padding: spacing.xl, paddingVertical: spacing.xxxl },
  messageTitle: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.xl, backgroundColor: colors.white, ...shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.pill },
  badgeText: { fontSize: fontSizes.xs },
  percent: { fontSize: fontSizes.lg },
  saved: { fontSize: fontSizes.xl, color: colors.textPrimary },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.sm },
  stat: { gap: spacing.xxs, minWidth: '28%' },
  statValue: { fontSize: fontSizes.sm, color: colors.textPrimary },
  description: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.xs },
  reached: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.xl, backgroundColor: colors.successSoft },
  reachedText: { fontSize: fontSizes.sm, color: colors.success, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  secondary: {
    flexGrow: 1,
    minHeight: sizes.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pressed: { opacity: 0.7 },
  secondaryText: { fontSize: fontSizes.sm, color: colors.textPrimary },
  danger: { color: colors.danger },
  sectionTitle: { fontSize: fontSizes.md, color: colors.textPrimary },
  entry: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  entryTexts: { flex: 1, gap: spacing.xxs },
  entryNote: { fontSize: fontSizes.sm, color: colors.textPrimary },
  entryAmount: { fontSize: fontSizes.sm, color: colors.success },
});
