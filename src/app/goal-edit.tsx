import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { AuthInput } from '@/features/auth/AuthInput';
import { BUDGET_CURRENCIES, readAmount } from '@/features/budget/budgetForm';
import { formatDay } from '@/features/goals/GoalCard';
import { HORIZONS, isoDay, monthsAhead, type Horizon } from '@/features/goals/goalForm';
import { can } from '@/features/goals/goalMath';
import { createGoal, getGoal, goalProblem, updateGoal } from '@/features/goals/goalsApi';
import type { Goal } from '@/features/goals/types';
import { toMinor } from '@/features/subscriptions/subscriptionMath';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

// 'keep': editing a goal whose date is not one of the choices; it stays as it is.
type DateChoice = Horizon | 'keep';

export default function GoalEditRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { language, t, isRTL } = useLanguage();
  const [existing, setExisting] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<string>('SAR');
  const [dateChoice, setDateChoice] = useState<DateChoice>(12);
  // New goals save automatically from bank SMS by default (no manual data entry)
  const [autoSave, setAutoSave] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/goals'));

  useEffect(() => {
    if (!id) return;
    getGoal(id)
      .then((goal) => {
        setExisting(goal);
        setName(goal.name);
        setDescription(goal.description ?? '');
        setAmount(goal.targetAmount);
        setCurrency(goal.currency);
        setDateChoice(goal.targetDate ? 'keep' : null);
        setAutoSave(goal.autoSave);
        setKeyword(goal.autoSaveKeyword ?? '');
      })
      .catch(() => {
        showToast(t('goals.loadError'));
        close();
      })
      .finally(() => setLoading(false));
    // Loads the goal once; close and t do not change what is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const target = readAmount(amount, currency);
  // The service refuses a target lower than what is already saved.
  const belowSaved = existing !== null && target.kind === 'ok' && target.minor < toMinor(existing.savedAmount, currency);
  const nameError = showErrors && !name.trim() ? t('goals.form.nameRequired') : undefined;
  const amountError = !showErrors
    ? undefined
    : target.kind !== 'ok'
      ? t(target.kind === 'empty' ? 'goals.form.amountRequired' : 'budgetEdit.amountInvalid')
      : belowSaved
        ? t('goals.form.amountBelowSaved', { amount: formatMoney(existing.savedAmount, currency, language) })
        : undefined;
  const currencyLocked = existing !== null && !can.changeCurrency(existing);
  const keywordError = showErrors && autoSave && !keyword.trim() ? t('goals.form.autoSaveKeywordRequired') : undefined;

  const targetDate = (): string | null => {
    if (dateChoice === 'keep') return existing?.targetDate ? isoDay(existing.targetDate) : null;
    return dateChoice === null ? null : isoDay(monthsAhead(dateChoice));
  };

  const save = async () => {
    setShowErrors(true);
    if (!name.trim() || target.kind !== 'ok' || belowSaved || (autoSave && !keyword.trim())) return;
    setSaving(true);
    const input = {
      name: name.trim().slice(0, 100),
      description: description.trim().slice(0, 500) || null,
      targetAmount: target.amount,
      currency,
      targetDate: targetDate(),
      autoSave,
      autoSaveKeyword: keyword.trim().slice(0, 60) || null,
    };
    try {
      if (existing) await updateGoal(existing.id, input);
      else await createGoal(input);
      showToast(t(existing ? 'goals.savedDone' : 'goals.createdDone', { name: input.name }));
      close();
    } catch (error) {
      showToast(t(`goals.problem.${goalProblem(error)}`));
      setSaving(false);
    }
  };

  const dateLabel = (choice: DateChoice) => {
    if (choice === 'keep') return existing?.targetDate ? formatDay(existing.targetDate, language) : '';
    if (choice === null) return t('goals.form.noDate');
    return choice < 12 ? t('goals.form.months', { count: String(choice) }) : t('goals.form.years', { count: String(choice / 12) });
  };
  const dateChoices: DateChoice[] = existing?.targetDate ? ['keep', ...HORIZONS] : [...HORIZONS];

  const chips = <T,>(values: readonly T[], selected: T, onSelect: (value: T) => void, label: (value: T) => string, disabled = false) => (
    <View style={styles.chips}>
      {values.map((value) => {
        const on = value === selected;
        return (
          <Pressable
            key={String(value)}
            onPress={() => onSelect(value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled }}
            style={[styles.chip, on && styles.chipOn, disabled && !on && styles.chipDisabled]}>
            <AppText weight="semibold" style={[styles.chipText, on && styles.chipTextOn]}>
              {label(value)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('budget.back')} style={styles.back}>
          {/* The chevron points right; flip it to point back in left-to-right layouts. */}
          <View style={!isRTL && styles.flip}>
            <Icon name="chevron" color={colors.textPrimary} size={sizes.iconLg} />
          </View>
        </Pressable>
        <AppText weight="bold" style={styles.title} accessibilityRole="header">
          {t(id ? 'goals.editTitle' : 'goals.newTitle')}
        </AppText>
        <View style={styles.back} />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}>
            <AuthInput
              label={t('goals.form.name')}
              value={name}
              onChangeText={setName}
              placeholder={t('goals.form.namePlaceholder')}
              maxLength={100}
              error={nameError}
            />
            <AuthInput
              label={t('goals.form.amount', { currency })}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              error={amountError}
            />
            <View style={styles.field}>
              <AppText weight="medium" style={styles.label}>
                {t('budgetEdit.currency')}
              </AppText>
              {chips(BUDGET_CURRENCIES, currency, setCurrency, (code) => code, currencyLocked)}
              {currencyLocked && <AppText style={styles.hint}>{t('goals.form.currencyLocked')}</AppText>}
            </View>
            <View style={styles.field}>
              <AppText weight="medium" style={styles.label}>
                {t('goals.form.when')}
              </AppText>
              {chips(dateChoices, dateChoice, setDateChoice, dateLabel)}
            </View>
            <View style={styles.autoSave}>
              <View style={styles.autoSaveRow}>
                <View style={styles.autoSaveTexts}>
                  <AppText weight="semibold" style={styles.label}>
                    {t('goals.form.autoSave')}
                  </AppText>
                  <AppText style={styles.hint}>{t('goals.form.autoSaveHelp')}</AppText>
                </View>
                <Switch
                  value={autoSave}
                  onValueChange={setAutoSave}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  accessibilityLabel={t('goals.form.autoSave')}
                />
              </View>
              {autoSave && (
                <>
                  <AuthInput
                    label={t('goals.form.autoSaveKeyword')}
                    value={keyword}
                    onChangeText={setKeyword}
                    placeholder={t('goals.form.autoSaveKeywordPlaceholder')}
                    maxLength={60}
                    error={keywordError}
                  />
                  <AppText style={styles.hint}>{t('goals.form.autoSaveKeywordHelp')}</AppText>
                </>
              )}
            </View>
            <AuthInput
              label={t('goals.form.description')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('goals.form.descriptionPlaceholder')}
              maxLength={500}
              multiline
            />
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton
              label={t(id ? 'goals.form.save' : 'goals.form.create')}
              onPress={() => void save()}
              loading={saving}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg },
  back: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  title: { flex: 1, textAlign: 'center', fontSize: fontSizes.lg, color: colors.textPrimary },
  spinner: { marginTop: spacing.xxxl },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg, paddingBottom: spacing.xxl },
  field: { gap: spacing.sm },
  label: { fontSize: fontSizes.sm, color: colors.textPrimary },
  hint: { fontSize: fontSizes.xs, color: colors.textSecondary },
  autoSave: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  autoSaveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  autoSaveTexts: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: sizes.touchMin,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  chipTextOn: { color: colors.primary },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
