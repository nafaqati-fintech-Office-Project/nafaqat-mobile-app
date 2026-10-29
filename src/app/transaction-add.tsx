import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { AuthInput } from '@/features/auth/AuthInput';
import { BUDGET_CURRENCIES, isBudgetCurrency, readAmount, type BudgetCurrency } from '@/features/budget/budgetForm';
import { getPreferences } from '@/features/dashboard/dashboardApi';
import { expenseInstant, recentDays } from '@/features/transactions/cashExpense';
import { categoryLabelKey, codeForCategory, pickableCategories } from '@/features/transactions/categoryDisplay';
import { addCashExpense } from '@/features/transactions/transactionsService';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';

const CATEGORIES = pickableCategories('DEBIT');

export default function TransactionAddRoute() {
  const { language, t, isRTL } = useLanguage();
  const [amount, setAmount] = useState('');
  // The user's own pick wins over their preferred currency, which arrives a moment later.
  const [picked, setPicked] = useState<BudgetCurrency | null>(null);
  const [preferred, setPreferred] = useState<BudgetCurrency | null>(null);
  const currency = picked ?? preferred ?? 'SAR';
  const [what, setWhat] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const days = useMemo(() => recentDays(new Date()), []);
  const [dayIndex, setDayIndex] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPreferences()
      .then((preferences) => {
        if (isBudgetCurrency(preferences?.currency)) setPreferred(preferences.currency);
      })
      .catch(() => undefined);
  }, []);

  const price = readAmount(amount, currency);
  const amountError =
    showErrors && price.kind !== 'ok'
      ? t(price.kind === 'empty' ? 'transactions.cash.amountRequired' : 'budgetEdit.amountInvalid')
      : undefined;

  const dayLabel = (day: Date, index: number) => {
    if (index === 0) return t('transactions.today');
    if (index === 1) return t('transactions.yesterday');
    return new Intl.DateTimeFormat(intlLocale(language), { weekday: 'short', day: 'numeric' }).format(day);
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/transactions'));

  const save = async () => {
    setShowErrors(true);
    if (price.kind !== 'ok') return;
    setSaving(true);
    const name = what.trim().slice(0, 255);
    try {
      await addCashExpense({
        amount: price.amount,
        currency,
        merchant: name || null,
        // The service needs a description; the row shows the merchant when there is one.
        description: name || t('transactions.cash.defaultDescription'),
        category: (category && codeForCategory(category)) ?? 'UNCATEGORIZED',
        transactionDate: expenseInstant(days[dayIndex], new Date()),
      });
      showToast(t('transactions.cash.added'));
      close();
    } catch (error) {
      const network = isAxiosError(error) && error.response === undefined;
      showToast(t(network ? 'errors.network' : 'transactions.cash.addFailed'));
      setSaving(false);
    }
  };

  const chips = <T,>(
    values: readonly T[],
    isSelected: (value: T, index: number) => boolean,
    onSelect: (value: T, index: number) => void,
    label: (value: T, index: number) => string,
  ) => (
    <View style={styles.chips}>
      {values.map((value, index) => {
        const on = isSelected(value, index);
        return (
          <Pressable
            key={label(value, index)}
            onPress={() => onSelect(value, index)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[styles.chip, on && styles.chipOn]}>
            <AppText weight="semibold" style={[styles.chipText, on && styles.chipTextOn]}>
              {label(value, index)}
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
          {t('transactions.cash.title')}
        </AppText>
        <View style={styles.back} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}>
        <AuthInput
          label={t('transactions.cash.amount', { currency })}
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
          {chips(
            BUDGET_CURRENCIES,
            (code) => code === currency,
            (code) => setPicked(code),
            (code) => code,
          )}
        </View>
        <AuthInput
          label={t('transactions.cash.what')}
          value={what}
          onChangeText={setWhat}
          placeholder={t('transactions.cash.whatPlaceholder')}
          maxLength={255}
        />
        <View style={styles.field}>
          <AppText weight="medium" style={styles.label}>
            {t('transactions.cash.category')}
          </AppText>
          {/* Optional: tapping the chosen one again clears it (saved as uncategorized). */}
          {chips(
            CATEGORIES,
            (name) => name === category,
            (name) => setCategory((current) => (current === name ? null : name)),
            (name) => {
              const key = categoryLabelKey(name);
              return key ? t(key) : name;
            },
          )}
        </View>
        <View style={styles.field}>
          <AppText weight="medium" style={styles.label}>
            {t('transactions.cash.when')}
          </AppText>
          {chips(days, (_, index) => index === dayIndex, (_, index) => setDayIndex(index), dayLabel)}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label={t('transactions.cash.save')} onPress={() => void save()} loading={saving} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg },
  back: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  title: { flex: 1, textAlign: 'center', fontSize: fontSizes.lg, color: colors.textPrimary },
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
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
