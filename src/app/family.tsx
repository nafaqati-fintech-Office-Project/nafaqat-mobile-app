import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { showUpgradePrompt } from '@/components/UpgradePrompt';
import { InfoCard } from '@/features/dashboard/InfoCard';
import { acceptInvitation, declineInvitation, familyProblem } from '@/features/family/familyApi';
import { FamilyHeader } from '@/features/family/FamilyHeader';
import { problemText } from '@/features/family/familyText';
import type { Invitation } from '@/features/family/types';
import { useFamilies, useMyInvitations } from '@/features/family/useFamilyData';
import { canUse } from '@/features/plans/plans';
import { usePlan } from '@/features/plans/usePlan';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';

export default function FamilyRoute() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { plan } = usePlan();
  const families = useFamilies();
  const invites = useMyInvitations();
  const [busy, setBusy] = useState<string | null>(null);

  // Coming back from a family or the form shows the change; the first focus is the initial load.
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) {
        void families.reload();
        void invites.reload();
      }
      focused.current = true;
    }, [families, invites]),
  );

  const refresh = async () => {
    await Promise.all([families.refresh(), invites.refresh()]);
  };

  const newFamily = () => {
    // Family accounts are a Premium feature: free users get the Premium message, which leads to the plans.
    if (plan !== null && !canUse(plan, 'family')) {
      showUpgradePrompt('family');
      return;
    }
    router.push('/family-create');
  };

  const respond = async (invitation: Invitation, accept: boolean) => {
    setBusy(invitation.id);
    try {
      await (accept ? acceptInvitation(invitation.id) : declineInvitation(invitation.id));
      showToast(t(accept ? 'family.invitation.accepted' : 'family.invitation.declined'));
      await Promise.all([families.reload(), invites.reload()]);
    } catch (error) {
      showToast(problemText(familyProblem(error), 'invitation'));
    } finally {
      setBusy(null);
    }
  };

  const shareId = () => {
    if (user) void Share.share({ message: user.id });
  };

  const loading = families.status === 'loading' || invites.status === 'loading';
  const failed = families.status === 'error' && families.families.length === 0;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <FamilyHeader
        title={t('family.title')}
        subtitle={t('family.subtitle')}
        fallback="/home"
        action={{ label: `+ ${t('family.new')}`, onPress: newFamily }}
      />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : failed ? (
        <View style={styles.message}>
          <AppText weight="medium" style={styles.messageText}>
            {t('family.loadError')}
          </AppText>
          <PrimaryButton label={t('budget.retry')} onPress={families.retry} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={families.refreshing || invites.refreshing} onRefresh={refresh} />}>
          {invites.invitations.length > 0 && (
            <InfoCard title={t('family.invitations')}>
              {invites.invitations.map((invitation) => (
                <View key={invitation.id} style={styles.invite}>
                  <AppText weight="semibold" style={styles.name}>
                    {invitation.familyName}
                  </AppText>
                  <AppText style={styles.meta}>{t('family.invitation.asRole', { role: t(`family.role.${invitation.role}`) })}</AppText>
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => respond(invitation, true)}
                      disabled={busy === invitation.id}
                      accessibilityRole="button"
                      style={[styles.accept, busy === invitation.id && styles.disabled]}>
                      <AppText weight="bold" style={styles.acceptText}>
                        {t('family.invitation.accept')}
                      </AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => respond(invitation, false)}
                      disabled={busy === invitation.id}
                      accessibilityRole="button"
                      style={[styles.decline, busy === invitation.id && styles.disabled]}>
                      <AppText weight="semibold" style={styles.declineText}>
                        {t('family.invitation.decline')}
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </InfoCard>
          )}

          {families.families.length > 0 ? (
            families.families.map((family) => (
              <Pressable
                key={family.id}
                onPress={() => router.push({ pathname: '/family-detail', params: { id: family.id } })}
                accessibilityRole="button"
                accessibilityLabel={family.name}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.cardTop}>
                  <AppText weight="bold" style={styles.name} numberOfLines={1}>
                    {family.name}
                  </AppText>
                  <View style={styles.badge}>
                    <AppText weight="semibold" style={styles.badgeText}>
                      {t(`family.role.${family.myRole}`)}
                    </AppText>
                  </View>
                </View>
                {family.description ? (
                  <AppText style={styles.meta} numberOfLines={2}>
                    {family.description}
                  </AppText>
                ) : null}
                <AppText style={styles.meta}>{family.currency}</AppText>
              </Pressable>
            ))
          ) : (
            <View style={styles.empty}>
              <AppText weight="semibold" style={styles.name}>
                {t('family.emptyTitle')}
              </AppText>
              <AppText style={styles.emptyText}>{t('family.emptyBody')}</AppText>
              <PrimaryButton label={t('family.new')} onPress={newFamily} />
            </View>
          )}

          {user && (
            <InfoCard title={t('family.yourId')}>
              <AppText style={styles.meta}>{t('family.yourIdNote')}</AppText>
              <AppText selectable style={styles.id}>
                {user.id}
              </AppText>
              <PrimaryButton label={t('family.shareId')} onPress={shareId} />
            </InfoCard>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  spinner: { marginTop: spacing.xxxl },
  message: { gap: spacing.lg, alignItems: 'center', padding: spacing.xl, paddingVertical: spacing.xxxl },
  messageText: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.xs, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.white, ...shadows.card },
  pressed: { opacity: 0.7 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  name: { flexShrink: 1, fontSize: fontSizes.md, color: colors.textPrimary },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  badgeText: { fontSize: fontSizes.xs, color: colors.primary },
  invite: { gap: spacing.xs, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  accept: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  acceptText: { fontSize: fontSizes.sm, color: colors.white },
  decline: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  declineText: { fontSize: fontSizes.sm, color: colors.textPrimary },
  disabled: { opacity: 0.4 },
  empty: { gap: spacing.md, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
  id: { fontSize: fontSizes.xs, color: colors.textPrimary },
});
