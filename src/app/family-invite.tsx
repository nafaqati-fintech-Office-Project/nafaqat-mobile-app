import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { AuthInput } from '@/features/auth/AuthInput';
import { createInvitation, familyProblem, getFamily } from '@/features/family/familyApi';
import { FamilyHeader } from '@/features/family/FamilyHeader';
import { problemText } from '@/features/family/familyText';
import { invitableRoles, isUuid } from '@/features/family/familyUtils';
import type { FamilyRole } from '@/features/family/types';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

// Invites a registered user by their user id (the service has no e-mail invitations). The invited person
// finds their id on their own Family screen.
export default function FamilyInviteRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const [roles, setRoles] = useState<FamilyRole[]>([]);
  const [role, setRole] = useState<FamilyRole>('MEMBER');
  const [userId, setUserId] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFamily(id)
      .then((family) => {
        const allowed = invitableRoles(family.myRole);
        setRoles(allowed);
        if (allowed.length > 0) setRole(allowed[0]);
      })
      .catch(() => showToast(t('family.loadError')));
    // Loads the caller's role once; t does not change what is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const idError = showErrors && !isUuid(userId) ? t('family.invite.idInvalid') : undefined;

  const submit = async () => {
    if (saving) return;
    setShowErrors(true);
    if (!isUuid(userId)) return;
    setSaving(true);
    try {
      await createInvitation(id, userId.trim(), role);
      showToast(t('family.invite.sent'));
      router.back();
    } catch (error) {
      showToast(problemText(familyProblem(error), 'invite'));
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <FamilyHeader title={t('family.invite.title')} fallback="/family" />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AppText style={styles.note}>{t('family.invite.note')}</AppText>
          <AuthInput
            label={t('family.invite.userId')}
            placeholder={t('family.invite.userIdPlaceholder')}
            value={userId}
            onChangeText={setUserId}
            error={idError}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
          {roles.length > 1 && (
            <View style={styles.field}>
              <AppText weight="medium" style={styles.label}>
                {t('family.invite.role')}
              </AppText>
              <View style={styles.chips}>
                {roles.map((r) => {
                  const on = r === role;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setRole(r)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      style={[styles.chip, on && styles.chipOn]}>
                      <AppText weight={on ? 'bold' : 'medium'} style={[styles.chipText, on && styles.chipTextOn]}>
                        {t(`family.role.${r}`)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
          <PrimaryButton label={t('family.invite.send')} onPress={submit} loading={saving} disabled={roles.length === 0} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  fill: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  note: { fontSize: fontSizes.sm, color: colors.textSecondary },
  field: { gap: spacing.sm },
  label: { fontSize: fontSizes.sm, color: colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: sizes.touchMin,
    minWidth: 88,
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
});
