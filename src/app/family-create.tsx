import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { AuthInput } from '@/features/auth/AuthInput';
import { deviceTimeZone } from '@/features/dashboard/dashboardBuilder';
import { createFamily, familyProblem } from '@/features/family/familyApi';
import { FamilyHeader } from '@/features/family/FamilyHeader';
import { problemText } from '@/features/family/familyText';
import { FAMILY_CURRENCIES } from '@/features/family/types';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;

export default function FamilyCreateRoute() {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<string>('SAR');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameError = showErrors && !name.trim() ? t('family.form.nameRequired') : undefined;

  const submit = async () => {
    if (saving) return;
    setShowErrors(true);
    if (!name.trim()) return;
    setSaving(true);
    try {
      const family = await createFamily({
        name: name.trim(),
        description: description.trim() || undefined,
        currency,
        timeZone: deviceTimeZone(),
      });
      showToast(t('family.form.created'));
      router.replace({ pathname: '/family-detail', params: { id: family.id } });
    } catch (error) {
      showToast(problemText(familyProblem(error), 'family'));
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <FamilyHeader title={t('family.form.title')} fallback="/family" />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthInput
            label={t('family.form.name')}
            placeholder={t('family.form.namePlaceholder')}
            value={name}
            onChangeText={setName}
            error={nameError}
            maxLength={MAX_NAME}
            returnKeyType="next"
          />
          <AuthInput
            label={t('family.form.description')}
            placeholder={t('family.form.descriptionPlaceholder')}
            value={description}
            onChangeText={setDescription}
            maxLength={MAX_DESCRIPTION}
            returnKeyType="done"
          />
          <View style={styles.field}>
            <AppText weight="medium" style={styles.label}>
              {t('family.form.currency')}
            </AppText>
            <View style={styles.chips}>
              {FAMILY_CURRENCIES.map((code) => {
                const on = code === currency;
                return (
                  <Pressable
                    key={code}
                    onPress={() => setCurrency(code)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.chip, on && styles.chipOn]}>
                    <AppText weight={on ? 'bold' : 'medium'} style={[styles.chipText, on && styles.chipTextOn]}>
                      {code}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppText style={styles.note}>{t('family.form.currencyNote')}</AppText>
          </View>
          <PrimaryButton label={t('family.form.create')} onPress={submit} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  fill: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  field: { gap: spacing.sm },
  label: { fontSize: fontSizes.sm, color: colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: sizes.touchMin,
    minWidth: 64,
    alignItems: 'center',
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
  note: { fontSize: fontSizes.xs, color: colors.textSecondary },
});
