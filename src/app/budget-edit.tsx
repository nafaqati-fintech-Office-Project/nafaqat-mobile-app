import { getLocales } from 'expo-localization';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentUserId } from '@/auth/currentUser';
import { AppText } from '@/components/AppText';
import { screenTitle } from '@/components/screenTitle';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { AuthInput } from '@/features/auth/AuthInput';
import { BUDGET_CURRENCIES, checkBudgetForm, fromMinor, isBudgetCurrency } from '@/features/budget/budgetForm';
import {
  archiveBudget,
  createBudget,
  getCurrentBudget,
  saveProblem,
  updateBudget,
  type SaveProblem,
} from '@/features/budget/budgetService';
import type { Budget } from '@/features/budget/types';
import { getPreferences } from '@/features/dashboard/dashboardApi';
import { deviceTimeZone, monthRange, todayIn } from '@/features/dashboard/dashboardBuilder';
import { categoryLabelKey, pickableCategories } from '@/features/transactions/categoryDisplay';
import { categoryLook } from '@/features/transactions/categoryLook';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontFamily, fontSizes, radius, sizes, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

const PROBLEM_TEXT: Record<SaveProblem, TranslationKey> = {
  exists: 'budgetEdit.problem.exists',
  archived: 'budgetEdit.problem.archived',
  overTotal: 'budgetEdit.overTotal',
  network: 'errors.network',
  unknown: 'budgetEdit.problem.unknown',
};

type Loaded = { budget: Budget | null; currency: string; timeZone: string };

// The phone's currency when the service supports it; PKR otherwise.
function deviceCurrency(): string {
  const code = getLocales()[0]?.currencyCode;
  return isBudgetCurrency(code) ? code : 'PKR';
}

// Category limit fields start from the budget's limits; whole amounts show without ".00".
const asInput = (amount: string) => amount.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');

export default function BudgetEditRoute() {
  const { t, language, isRTL } = useLanguage();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [currency, setCurrency] = useState('PKR');
  const [total, setTotal] = useState('');
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  // The current budget (edit) or none (create), and the defaults for a new one.
  useEffect(() => {
    let active = true;
    Promise.all([getCurrentBudget(), getPreferences().catch(() => null)])
      .then(([budget, preferences]) => {
        if (!active) return;
        const preferred = preferences?.currency;
        const start = budget?.currency ?? (isBudgetCurrency(preferred) ? preferred : deviceCurrency());
        setLoaded({ budget, currency: start, timeZone: preferences?.timezone ?? deviceTimeZone() });
        setCurrency(start);
        if (budget) {
          setTotal(asInput(budget.limit));
          setLimits(Object.fromEntries(budget.categories.map((c) => [c.category, asInput(c.limit)])));
        }
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  const editing = loaded?.budget ?? null;
  const check = checkBudgetForm(total, limits, currency);
  const money = (minor: number) => formatMoney(fromMinor(minor, currency), currency, language);
  const today = todayIn(loaded?.timeZone ?? deviceTimeZone());
  const monthDate = editing?.startDate ?? new Date(today.year, today.month - 1, 1);
  const monthLabel = new Intl.DateTimeFormat(intlLocale(language), { month: 'long', year: 'numeric' }).format(monthDate);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/budget'));

  const save = async () => {
    setShowErrors(true);
    if (!loaded || !check.body) return;
    setSaving(true);
    try {
      if (editing) {
        await updateBudget(editing.id, check.body);
      } else {
        const range = monthRange(today.year, today.month);
        await createBudget({
          ...check.body,
          userId: getCurrentUserId() ?? '',
          periodStart: range.startDate,
          periodEnd: range.endDate,
          currency,
          timeZone: loaded.timeZone,
        });
      }
      showToast(t('budgetEdit.saved'));
      close();
    } catch (error) {
      showToast(t(PROBLEM_TEXT[saveProblem(error)]));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert(t('budgetEdit.deleteTitle'), t('budgetEdit.deleteBody'), [
      { text: t('notifications.cancel'), style: 'cancel' },
      {
        text: t('budgetEdit.delete'),
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await archiveBudget(editing.id);
            showToast(t('budgetEdit.deleted'));
            close();
          } catch (error) {
            showToast(t(PROBLEM_TEXT[saveProblem(error)]));
            setSaving(false);
          }
        },
      },
    ]);
  };

  const totalError =
    showErrors && check.totalError
      ? t(check.totalError === 'required' ? 'budgetEdit.totalRequired' : 'budgetEdit.amountInvalid')
      : undefined;

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
          {t(editing ? 'budgetEdit.editTitle' : 'budgetEdit.createTitle')}
        </AppText>
      </View>

      {failed ? (
        <View style={styles.message}>
          <AppText weight="medium" style={styles.messageText}>
            {t('budget.loadError')}
          </AppText>
        </View>
      ) : !loaded ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}>
            <AppText style={styles.month}>{t('budgetEdit.forMonth', { month: monthLabel })}</AppText>

            {editing ? (
              <AppText style={styles.note}>{t('budgetEdit.currencyFixed', { currency })}</AppText>
            ) : (
              <View style={styles.field}>
                <AppText weight="medium" style={styles.label}>
                  {t('budgetEdit.currency')}
                </AppText>
                <View style={styles.chips}>
                  {BUDGET_CURRENCIES.map((code) => (
                    <Pressable
                      key={code}
                      onPress={() => setCurrency(code)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: code === currency }}
                      style={[styles.chip, code === currency && styles.chipOn]}>
                      <AppText weight="semibold" style={[styles.chipText, code === currency && styles.chipTextOn]}>
                        {code}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <AuthInput
              label={t('budgetEdit.total', { currency })}
              value={total}
              onChangeText={setTotal}
              keyboardType="decimal-pad"
              placeholder="0"
              error={totalError}
            />

            <View style={styles.field}>
              <AppText weight="bold" style={styles.section}>
                {t('budgetEdit.categoryLimits')}
              </AppText>
              <AppText style={styles.note}>{t('budgetEdit.categoryHint')}</AppText>
              <AppText
                weight="semibold"
                style={[styles.allocated, check.overTotal && styles.over]}
                accessibilityLiveRegion="polite">
                {check.overTotal
                  ? t('budgetEdit.overBy', { amount: money(check.allocatedMinor - check.totalMinor) })
                  : t('budgetEdit.allocated', { amount: money(check.allocatedMinor), total: money(check.totalMinor) })}
              </AppText>
            </View>

            {pickableCategories('DEBIT').map((category) => {
              const look = categoryLook(category);
              const labelKey = categoryLabelKey(category);
              const name = labelKey ? t(labelKey) : category;
              const invalid = showErrors && check.invalidCategories.includes(category);
              return (
                <View key={category} style={styles.row}>
                  <View style={[styles.tile, { backgroundColor: look.tintSoft }]}>
                    <Icon name={look.icon} color={look.tint} size={sizes.icon} />
                  </View>
                  <AppText weight="medium" style={styles.rowName} numberOfLines={1}>
                    {name}
                  </AppText>
                  <TextInput
                    value={limits[category] ?? ''}
                    onChangeText={(text) => setLimits((current) => ({ ...current, [category]: text }))}
                    keyboardType="decimal-pad"
                    placeholder={t('budgetEdit.noLimit')}
                    placeholderTextColor={colors.textSecondary}
                    accessibilityLabel={t('budgetEdit.limitFor', { category: name })}
                    style={[styles.rowInput, { fontFamily: fontFamily('regular') }, invalid && styles.inputError]}
                  />
                </View>
              );
            })}

            {editing && (
              <Pressable onPress={confirmDelete} disabled={saving} accessibilityRole="button" style={styles.delete}>
                <Icon name="trash" color={colors.danger} size={sizes.icon} />
                <AppText weight="semibold" style={styles.deleteText}>
                  {t('budgetEdit.delete')}
                </AppText>
              </Pressable>
            )}
          </ScrollView>
          <View style={styles.footer}>
            {showErrors && check.invalidCategories.length > 0 && (
              <AppText style={styles.footerError}>{t('budgetEdit.amountInvalid')}</AppText>
            )}
            <PrimaryButton label={t('budgetEdit.save')} onPress={() => void save()} loading={saving} />
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
  title: { flex: 1, ...screenTitle },
  spinner: { marginTop: spacing.xxxl },
  message: { padding: spacing.xl, paddingVertical: spacing.xxl },
  messageText: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg, paddingBottom: spacing.xxl },
  month: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
  field: { gap: spacing.sm },
  label: { fontSize: fontSizes.sm, color: colors.textPrimary },
  section: { fontSize: fontSizes.md, color: colors.textPrimary },
  note: { fontSize: fontSizes.xs, color: colors.textSecondary },
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
  allocated: { fontSize: fontSizes.sm, color: colors.textPrimary },
  over: { color: colors.danger },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  tile: { width: sizes.chipIcon, height: sizes.chipIcon, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  rowName: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary },
  rowInput: {
    width: 120,
    minHeight: sizes.touchMin,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  inputError: { borderColor: colors.danger },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: sizes.touchMin },
  deleteText: { fontSize: fontSizes.sm, color: colors.danger },
  footer: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  footerError: { fontSize: fontSizes.xs, color: colors.danger, textAlign: 'center' },
});
