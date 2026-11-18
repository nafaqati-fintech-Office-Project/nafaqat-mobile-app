import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { screenTitle } from '@/components/screenTitle';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { AuthInput } from '@/features/auth/AuthInput';
import { BUDGET_CURRENCIES, isBudgetCurrency, readAmount } from '@/features/budget/budgetForm';
import { lastChargeDate, readDay } from '@/features/subscriptions/chargeDate';
import { CYCLE_LABEL } from '@/features/subscriptions/SubscriptionRow';
import { actionProblem, addSubscription } from '@/features/subscriptions/subscriptionsService';
import type { BillingCycle } from '@/features/subscriptions/types';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

const CYCLES: BillingCycle[] = ['MONTHLY', 'YEARLY', 'QUARTERLY', 'WEEKLY'];

export default function SubscriptionAddRoute() {
  const { t, isRTL } = useLanguage();
  const params = useLocalSearchParams<{ currency?: string }>();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(isBudgetCurrency(params.currency) ? params.currency : 'SAR');
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY');
  const [day, setDay] = useState(String(new Date().getDate()));
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  // The service keeps 2 decimals for every currency.
  const price = readAmount(amount, 'SAR');
  const chargeDay = readDay(day);
  const nameError = showErrors && !name.trim() ? t('subscriptions.form.nameRequired') : undefined;
  const amountError =
    showErrors && price.kind !== 'ok'
      ? t(price.kind === 'empty' ? 'subscriptions.form.amountRequired' : 'budgetEdit.amountInvalid')
      : undefined;
  const dayError = showErrors && chargeDay === null ? t('subscriptions.form.dayInvalid') : undefined;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/subscriptions'));

  const save = async () => {
    setShowErrors(true);
    if (!name.trim() || price.kind !== 'ok' || chargeDay === null) return;
    setSaving(true);
    try {
      await addSubscription({
        displayName: name.trim().slice(0, 120),
        amount: Number(price.amount),
        currency,
        cycle,
        startDate: lastChargeDate(chargeDay),
      });
      showToast(t('subscriptions.added', { name: name.trim() }));
      close();
    } catch (error) {
      const problem = actionProblem(error);
      showToast(
        problem === 'duplicate'
          ? t('subscriptions.problem.duplicate', { name: name.trim() })
          : t(problem === 'network' ? 'errors.network' : 'subscriptions.problem.unknown'),
      );
      setSaving(false);
    }
  };

  const chips = <T extends string>(values: readonly T[], selected: T, onSelect: (value: T) => void, label: (value: T) => string) => (
    <View style={styles.chips}>
      {values.map((value) => (
        <Pressable
          key={value}
          onPress={() => onSelect(value)}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === selected }}
          style={[styles.chip, value === selected && styles.chipOn]}>
          <AppText weight="semibold" style={[styles.chipText, value === selected && styles.chipTextOn]}>
            {label(value)}
          </AppText>
        </Pressable>
      ))}
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
        <AppText weight="bold" style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
          {t('subscriptions.addTitle')}
        </AppText>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}>
        <AuthInput
          label={t('subscriptions.form.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('subscriptions.form.namePlaceholder')}
          maxLength={120}
          error={nameError}
        />
        <View style={styles.field}>
          <AppText weight="medium" style={styles.label}>
            {t('budgetEdit.currency')}
          </AppText>
          {chips(BUDGET_CURRENCIES, currency, setCurrency, (code) => code)}
        </View>
        <AuthInput
          label={t('subscriptions.form.amount', { currency })}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          error={amountError}
        />
        <View style={styles.field}>
          <AppText weight="medium" style={styles.label}>
            {t('subscriptions.form.cycle')}
          </AppText>
          {chips(CYCLES, cycle, setCycle, (value) => t(CYCLE_LABEL[value]))}
        </View>
        <AuthInput
          label={t('subscriptions.form.day')}
          value={day}
          onChangeText={setDay}
          keyboardType="number-pad"
          maxLength={2}
          error={dayError}
        />
        <AppText style={styles.hint}>{t('subscriptions.form.dayHint')}</AppText>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label={t('subscriptions.form.save')} onPress={() => void save()} loading={saving} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg },
  back: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  title: { flex: 1, ...screenTitle },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg, paddingBottom: spacing.xxl },
  field: { gap: spacing.sm },
  label: { fontSize: fontSizes.sm, color: colors.textPrimary },
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
  chipText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  chipTextOn: { color: colors.primary },
  hint: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: -spacing.sm },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
