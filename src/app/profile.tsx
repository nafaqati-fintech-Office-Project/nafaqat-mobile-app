import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { screenTitle } from '@/components/screenTitle';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { AUTH_BYPASS } from '@/config/flags';
import { AuthInput } from '@/features/auth/AuthInput';
import { BUDGET_CURRENCIES } from '@/features/budget/budgetForm';
import { deviceTimeZone } from '@/features/dashboard/dashboardBuilder';
import {
  createPreferences,
  getProfile,
  getUserPreferences,
  profileProblem,
  updatePreferences,
  updateProfile,
  type Preferences,
  type Profile,
} from '@/features/profile/profileApi';
import {
  cleanPhone,
  DEFAULT_CYCLE_DAY,
  isPhone,
  MAX_CYCLE_DAY,
  MIN_CYCLE_DAY,
  newPreferences,
  profileBody,
  samePreferences,
  sameProfile,
  TIME_ZONES,
  type ProfileFields,
} from '@/features/profile/profileForm';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

type Status = 'loading' | 'ready' | 'error';
type Loaded = [Profile, Preferences | null];

// The bypass session has no token, so the service would answer 401 and end the session.
const load = async (): Promise<Loaded> => {
  if (AUTH_BYPASS) throw new Error('No session');
  return Promise.all([getProfile(), getUserPreferences()]);
};

export default function ProfileRoute() {
  const { language, t, isRTL } = useLanguage();
  const { user, setFirstName: showFirstName } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [savedProfile, setSavedProfile] = useState<ProfileFields | null>(null);
  const [savedPreferences, setSavedPreferences] = useState<Preferences | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState<string>('SAR');
  const [timezone, setTimezone] = useState(deviceTimeZone());
  const [cycleDay, setCycleDay] = useState(DEFAULT_CYCLE_DAY);
  const [showErrors, setShowErrors] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);
  const [saving, setSaving] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/more'));

  const show = useCallback(([profile, preferences]: Loaded) => {
    setSavedProfile(profile);
    setSavedPreferences(preferences);
    setFirstName(profile.firstName);
    setLastName(profile.lastName ?? '');
    setPhone(profile.phone ?? '');
    if (preferences) {
      setCurrency(preferences.currency);
      setTimezone(preferences.timezone);
      setCycleDay(preferences.budgetCycleDay);
    }
    setStatus('ready');
  }, []);

  useEffect(() => {
    let active = true;
    load()
      .then((loaded) => active && show(loaded))
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [show]);

  const retry = () => {
    setStatus('loading');
    load()
      .then(show)
      .catch(() => setStatus('error'));
  };

  const typedPhone = cleanPhone(phone);
  const nameError = showErrors && !firstName.trim() ? t('profile.firstNameRequired') : undefined;
  const phoneError = phoneTaken
    ? t('profile.phoneTaken')
    : showErrors && typedPhone && !isPhone(typedPhone)
      ? t('profile.phoneInvalid')
      : undefined;

  const save = async () => {
    setShowErrors(true);
    if (!firstName.trim() || (typedPhone && !isPhone(typedPhone))) return;
    setSaving(true);
    const profile = { firstName: firstName.trim(), lastName: lastName.trim() || null, phone: typedPhone || null };
    const preferences = { currency, timezone, budgetCycleDay: cycleDay };
    try {
      if (!savedProfile || !sameProfile(savedProfile, profile)) {
        setSavedProfile(await updateProfile(profileBody(profile)));
        showFirstName(profile.firstName);
      }
      if (!samePreferences(savedPreferences, preferences)) {
        await (savedPreferences ? updatePreferences(preferences) : createPreferences(newPreferences(preferences, language)));
      }
      showToast(t('profile.saved'));
      close();
    } catch (error) {
      const problem = profileProblem(error);
      setPhoneTaken(problem === 'phoneTaken');
      showToast(t(`profile.problem.${problem}`));
      setSaving(false);
    }
  };

  // A stored value that is not one of the choices stays selectable.
  const currencies = [...new Set([currency, ...BUDGET_CURRENCIES])];
  const zones = [...new Set([timezone, deviceTimeZone(), ...TIME_ZONES])];

  const chips = (values: string[], selected: string, onSelect: (value: string) => void) => (
    <View style={styles.chips}>
      {values.map((value) => {
        const on = value === selected;
        return (
          <Pressable
            key={value}
            onPress={() => onSelect(value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[styles.chip, on && styles.chipOn]}>
            <AppText weight="semibold" style={[styles.chipText, on && styles.chipTextOn]}>
              {value}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  const step = (label: string, sign: string, next: number) => (
    <Pressable
      onPress={() => setCycleDay(next)}
      disabled={next < MIN_CYCLE_DAY || next > MAX_CYCLE_DAY}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.step,
        (next < MIN_CYCLE_DAY || next > MAX_CYCLE_DAY) && styles.stepDisabled,
        pressed && styles.pressed,
      ]}>
      <AppText weight="bold" style={styles.stepText}>
        {sign}
      </AppText>
    </Pressable>
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
          {t('profile.title')}
        </AppText>
      </View>
      {status === 'loading' ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : status === 'error' ? (
        <View style={styles.message}>
          <AppText weight="medium" style={styles.messageTitle}>
            {t('profile.loadError')}
          </AppText>
          <PrimaryButton label={t('budget.retry')} onPress={retry} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}>
            {user?.email ? (
              <View style={styles.field}>
                <AppText weight="medium" style={styles.label}>
                  {t('profile.email')}
                </AppText>
                <AppText style={styles.email}>{user.email}</AppText>
              </View>
            ) : null}
            <AuthInput
              label={t('profile.firstName')}
              value={firstName}
              onChangeText={setFirstName}
              maxLength={100}
              autoComplete="given-name"
              error={nameError}
            />
            <AuthInput
              label={t('profile.lastName')}
              value={lastName}
              onChangeText={setLastName}
              maxLength={100}
              autoComplete="family-name"
            />
            <AuthInput
              label={t('profile.phone')}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setPhoneTaken(false);
              }}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="+923001234567"
              error={phoneError}
            />
            <View style={styles.field}>
              <AppText weight="medium" style={styles.label}>
                {t('budgetEdit.currency')}
              </AppText>
              {chips(currencies, currency, setCurrency)}
              <AppText style={styles.hint}>{t('profile.currencyHint')}</AppText>
            </View>
            <View style={styles.field}>
              <AppText weight="medium" style={styles.label}>
                {t('profile.timeZone')}
              </AppText>
              {chips(zones, timezone, setTimezone)}
            </View>
            <View style={styles.field}>
              <AppText weight="medium" style={styles.label}>
                {t('profile.budgetDay')}
              </AppText>
              <View style={styles.stepper}>
                {step(t('profile.dayLess'), '−', cycleDay - 1)}
                <AppText weight="bold" style={styles.day}>
                  {String(cycleDay)}
                </AppText>
                {step(t('profile.dayMore'), '+', cycleDay + 1)}
              </View>
              <AppText style={styles.hint}>{t('profile.budgetDayHint')}</AppText>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton label={t('profile.save')} onPress={() => void save()} loading={saving} />
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
  message: { gap: spacing.lg, alignItems: 'center', padding: spacing.xl, paddingVertical: spacing.xxxl },
  messageTitle: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg, paddingBottom: spacing.xxl },
  field: { gap: spacing.sm },
  label: { fontSize: fontSizes.sm, color: colors.textPrimary },
  email: { fontSize: fontSizes.md, color: colors.textSecondary },
  hint: { fontSize: fontSizes.xs, color: colors.textSecondary },
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
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  step: {
    width: sizes.touchMin,
    height: sizes.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  stepDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  stepText: { fontSize: fontSizes.lg, color: colors.textPrimary },
  day: { minWidth: sizes.touchMin, textAlign: 'center', fontSize: fontSizes.lg, color: colors.textPrimary },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
