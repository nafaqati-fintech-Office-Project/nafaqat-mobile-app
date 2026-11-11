import { isAxiosError } from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { AuthInput } from '@/features/auth/AuthInput';
import { BUDGET_CURRENCIES, isBudgetCurrency, readAmount, type BudgetCurrency } from '@/features/budget/budgetForm';
import { getPreferences } from '@/features/dashboard/dashboardApi';
import { hasLikelyDuplicate } from '@/features/receipts/duplicate';
import { convertAmount } from '@/features/receipts/convertCurrency';
import { isReceiptCurrency, receiptDay } from '@/features/receipts/parseReceipt';
import { daysWithReceiptDay, expenseInstant, recentDays } from '@/features/transactions/cashExpense';
import { categoryLabelKey, codeForCategory, pickableCategories } from '@/features/transactions/categoryDisplay';
import { addCashExpense, getTransactionPage } from '@/features/transactions/transactionsService';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';

const CATEGORIES = pickableCategories('DEBIT');

export default function TransactionAddRoute() {
  const { language, t, isRTL } = useLanguage();
  // Opened after a receipt scan: what the server read, to be checked before adding.
  const scan = useLocalSearchParams<{ scanned?: string; amount?: string; currency?: string; merchant?: string; category?: string; date?: string }>();
  const scanned = scan.scanned === '1';
  const [amount, setAmount] = useState(scanned ? (scan.amount ?? '') : '');
  // The user's own pick wins over their preferred currency, which arrives a moment later.
  const [picked, setPicked] = useState<BudgetCurrency | null>(isBudgetCurrency(scan.currency) ? scan.currency : null);
  const [preferred, setPreferred] = useState<BudgetCurrency | null>(null);
  const currency = picked ?? preferred ?? 'SAR';
  const [what, setWhat] = useState(scanned ? (scan.merchant ?? '') : '');
  const [category, setCategory] = useState<string | null>(scanned && scan.category && CATEGORIES.includes(scan.category) ? scan.category : null);
  const days = useMemo(() => {
    const now = new Date();
    return daysWithReceiptDay(recentDays(now), scanned ? receiptDay(scan.date) : null, now);
  }, [scanned, scan.date]);
  const [dayIndex, setDayIndex] = useState(() => {
    const day = scanned ? receiptDay(scan.date) : null;
    const index = day ? days.findIndex((d) => d.getTime() === day.getTime()) : -1;
    return Math.max(index, 0);
  });
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  // Set when a receipt in another currency was converted: the original amount, for the note.
  const [convertedFrom, setConvertedFrom] = useState<string | null>(null);

  useEffect(() => {
    getPreferences()
      .then(async (preferences) => {
        const target = isBudgetCurrency(preferences?.currency) ? preferences.currency : null;
        if (!target) return;
        setPreferred(target);
        // A receipt in another currency is added in the person's own currency.
        if (scanned && isReceiptCurrency(scan.currency) && scan.currency !== target && scan.amount) {
          const converted = await convertAmount(scan.amount, scan.currency, target);
          if (converted) {
            setAmount(converted);
            setPicked(null);
            setConvertedFrom(`${scan.amount} ${scan.currency}`);
          }
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const price = readAmount(amount, currency);
  const amountError =
    showErrors && price.kind !== 'ok'
      ? t(price.kind === 'empty' ? 'transactions.cash.amountRequired' : 'budgetEdit.amountInvalid')
      : undefined;

  const dayLabel = (day: Date, index: number) => {
    if (index === 0) return t('transactions.today');
    if (index === 1) return t('transactions.yesterday');
    // A receipt older than the last week: show its date in full.
    if (index >= 7) return new Intl.DateTimeFormat(intlLocale(language), { day: 'numeric', month: 'short' }).format(day);
    return new Intl.DateTimeFormat(intlLocale(language), { weekday: 'short', day: 'numeric' }).format(day);
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/transactions'));

  const save = async () => {
    setShowErrors(true);
    if (price.kind !== 'ok') return;
    if (scanned) {
      setSaving(true);
      // A scan may repeat an SMS or an earlier scan; ask first. If the check itself fails, just add.
      const duplicate = await getTransactionPage({ filter: 'expenses', search: '', page: 0, size: 50 })
        .then((page) => hasLikelyDuplicate(page.items, { amount: price.amount, currency, day: days[dayIndex] }))
        .catch(() => false);
      if (duplicate) {
        setSaving(false);
        Alert.alert(t('receipts.duplicateTitle'), t('receipts.duplicateBody'), [
          { text: t('notifications.cancel'), style: 'cancel' },
          { text: t('receipts.duplicateAdd'), onPress: () => void submit(price.amount) },
        ]);
        return;
      }
    }
    await submit(price.amount);
  };

  const submit = async (amountToAdd: string) => {
    setSaving(true);
    const name = what.trim().slice(0, 255);
    try {
      await addCashExpense({
        amount: amountToAdd,
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
        {scanned && (
          <AppText weight="medium" style={styles.scanNote}>
            {t('receipts.checkDetails')}
          </AppText>
        )}
        {convertedFrom && (
          <AppText weight="medium" style={styles.scanNote}>
            {t('receipts.converted', { original: convertedFrom, currency })}
          </AppText>
        )}
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
  scanNote: { fontSize: fontSizes.sm, color: colors.primary },
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
