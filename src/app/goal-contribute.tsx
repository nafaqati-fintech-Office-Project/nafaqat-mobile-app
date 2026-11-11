import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { AuthInput } from '@/features/auth/AuthInput';
import { readAmount } from '@/features/budget/budgetForm';
import { newRequestId } from '@/features/goals/goalForm';
import { remainingOf } from '@/features/goals/goalMath';
import { addContribution, getGoal, goalProblem } from '@/features/goals/goalsApi';
import type { Goal } from '@/features/goals/types';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

// A sheet over the goal: how much was put aside, with an optional note.
export default function GoalContributeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, t } = useLanguage();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  // Tapping again after a failure repeats the same request; the service refuses that id for a different amount.
  const attempt = useRef<{ amount: string; requestId: string } | null>(null);

  useEffect(() => {
    getGoal(id)
      .then(setGoal)
      .catch(() => router.back());
  }, [id]);

  if (!goal) return <View style={styles.sheet} />;

  const value = readAmount(amount, goal.currency);
  const amountError =
    showErrors && value.kind !== 'ok'
      ? t(value.kind === 'empty' ? 'goals.form.contributionRequired' : 'budgetEdit.amountInvalid')
      : undefined;

  const save = async () => {
    setShowErrors(true);
    if (value.kind !== 'ok') return;
    setSaving(true);
    if (attempt.current?.amount !== value.amount) attempt.current = { amount: value.amount, requestId: newRequestId() };
    try {
      await addContribution(goal.id, value.amount, note.trim().slice(0, 255) || null, attempt.current.requestId);
      showToast(t('goals.contributedDone', { amount: formatMoney(value.amount, goal.currency, language), name: goal.name }));
      router.back();
    } catch (error) {
      showToast(t(`goals.problem.${goalProblem(error)}`));
      setSaving(false);
    }
  };

  return (
    <View style={styles.sheet}>
      <AppText weight="bold" style={styles.title}>
        {t('goals.addMoney')}
      </AppText>
      <AppText style={styles.meta}>
        {t('goals.stillNeeded', { amount: formatMoney(remainingOf(goal), goal.currency, language), name: goal.name })}
      </AppText>
      {goal.autoSave && <AppText style={styles.meta}>{t('goals.autoSaveContributeHint')}</AppText>}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <AuthInput
          label={t('goals.form.contribution', { currency: goal.currency })}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          autoFocus
          error={amountError}
        />
        <AuthInput
          label={t('goals.form.note')}
          value={note}
          onChangeText={setNote}
          placeholder={t('goals.form.notePlaceholder')}
          maxLength={255}
        />
        <PrimaryButton label={t('goals.addMoney')} onPress={() => void save()} loading={saving} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, padding: spacing.xl, gap: spacing.xs, backgroundColor: colors.white },
  title: { fontSize: fontSizes.lg, color: colors.textPrimary },
  meta: { fontSize: fontSizes.sm, color: colors.textSecondary },
  content: { gap: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
});
