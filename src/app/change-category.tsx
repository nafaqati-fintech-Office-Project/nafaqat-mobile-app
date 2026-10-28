import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { Checkbox } from '@/features/auth/Checkbox';
import { CategoryChip } from '@/features/transactions/CategoryChip';
import { categoryLabelKey, pickableCategories } from '@/features/transactions/categoryDisplay';
import { changeCategory } from '@/features/transactions/categoryRules';
import { getTransaction, type StoredTransaction } from '@/features/transactions/transactionsRepo';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

export default function ChangeCategoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const [txn, setTxn] = useState<StoredTransaction | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [applyToAll, setApplyToAll] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTransaction(Number(id))
      .then((row) => {
        setTxn(row);
        setSelected(row?.category ?? null);
      })
      .catch(() => setTxn(null));
  }, [id]);

  if (!txn) return <View style={styles.sheet} />;

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await changeCategory({ id: txn.id, category: selected, applyToMerchant: applyToAll && txn.merchant !== null });
      router.back();
    } catch {
      showToast(t('category.saveFailed'));
      setSaving(false);
    }
  };

  return (
    <View style={styles.sheet}>
      <AppText weight="bold" style={styles.title}>
        {t('category.change')}
      </AppText>
      <View style={styles.current}>
        <AppText weight="semibold" style={styles.name} numberOfLines={1}>
          {txn.merchant ?? txn.bank}
        </AppText>
        <CategoryChip category={txn.category} />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {pickableCategories(txn.type).map((category) => {
          const checked = category === selected;
          const key = categoryLabelKey(category);
          const label = key ? t(key) : category;
          return (
            <Pressable
              key={category}
              onPress={() => setSelected(category)}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={label}
              style={[styles.option, checked && styles.optionChecked]}>
              <AppText weight={checked ? 'semibold' : 'regular'} style={styles.optionLabel}>
                {label}
              </AppText>
              {checked && (
                <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24">
                  <Path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    stroke={colors.primary}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {txn.merchant !== null && (
        <Checkbox label={t('category.applyToAll')} checked={applyToAll} onChange={setApplyToAll} />
      )}
      <PrimaryButton label={t('category.save')} onPress={save} loading={saving} disabled={!selected} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.white, padding: spacing.xl, gap: spacing.md },
  title: { fontSize: fontSizes.lg, color: colors.textPrimary },
  current: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1, fontSize: fontSizes.md, color: colors.textPrimary },
  list: { flex: 1 },
  listContent: { gap: spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: sizes.touchMin,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChecked: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionLabel: { fontSize: fontSizes.sm, color: colors.textPrimary },
});
