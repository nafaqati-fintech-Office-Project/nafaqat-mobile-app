import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { ProgressBar } from '@/features/budget/ProgressBar';
import type { BudgetTone } from '@/features/budget/budgetMath';
import { InfoCard } from '@/features/dashboard/InfoCard';
import {
  changeMemberRole,
  deleteFamily,
  familyProblem,
  leaveFamily,
  removeMember,
  revokeInvitation,
  transferOwnership,
  unshareTransaction,
} from '@/features/family/familyApi';
import { FamilyHeader } from '@/features/family/FamilyHeader';
import { problemText } from '@/features/family/familyText';
import { canRemoveMember, memberTag, permissionsFor } from '@/features/family/familyUtils';
import type { Member, SharedTransaction, UsageStatus } from '@/features/family/types';
import { useFamilyDetail } from '@/features/family/useFamilyData';
import { categoryFromCode, categoryLabelKey } from '@/features/transactions/categoryDisplay';
import { categoryLook } from '@/features/transactions/categoryLook';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';
import { intlLocale, monthName } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

const TONE: Record<UsageStatus, BudgetTone> = { ON_TRACK: 'ok', WARNING: 'warning', EXCEEDED: 'over' };
const STATUS_LABEL: Record<UsageStatus, TranslationKey> = {
  ON_TRACK: 'family.budget.onTrack',
  WARNING: 'family.budget.warning',
  EXCEEDED: 'family.budget.exceeded',
};

export default function FamilyDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const detail = useFamilyDetail(id);
  const [busy, setBusy] = useState(false);
  const family = detail.family.data;
  const dashboard = detail.dashboard.data;
  const perms = permissionsFor(detail.role);
  const myUserId = user?.id ?? null;

  // Coming back from the invite form shows the change; the first focus is the initial load.
  const focused = useRef(false);
  const { reloadAll } = detail;
  useFocusEffect(
    useCallback(() => {
      if (focused.current) void reloadAll();
      focused.current = true;
    }, [reloadAll]),
  );

  const money = (amount: string, currency: string) => formatMoney(amount, currency, language);
  const day = new Intl.DateTimeFormat(intlLocale(language), { dateStyle: 'medium' });
  const categoryName = (code: string) => {
    const app = categoryFromCode(code);
    const key = app ? categoryLabelKey(app) : null;
    return key ? t(key) : (app ?? code);
  };
  const who = (userId: string) => (userId === myUserId ? t('family.you') : memberTag(userId));

  // Runs one change, then shows the new state. Every failure says what it was about, never the server's text.
  const run = async (action: () => Promise<void>, done: string, context: 'family' | 'member' | 'share' = 'member') => {
    if (busy) return false;
    setBusy(true);
    try {
      await action();
      showToast(done);
      await detail.reloadAll();
      return true;
    } catch (error) {
      showToast(problemText(familyProblem(error), context));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirm = (title: string, body: string, action: string, onConfirm: () => void) =>
    Alert.alert(title, body, [
      { text: t('notifications.cancel'), style: 'cancel' },
      { text: action, style: 'destructive', onPress: onConfirm },
    ]);

  const onRemove = (member: Member) =>
    confirm(t('family.member.removeTitle'), t('family.member.removeBody'), t('family.member.remove'), () => {
      void run(() => removeMember(id, member.id), t('family.member.removed'));
    });

  const onRole = (member: Member) => {
    const next = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    void run(() => changeMemberRole(id, member.id, next), t('family.member.roleChanged'));
  };

  const onTransfer = (member: Member) =>
    confirm(t('family.member.transferTitle'), t('family.member.transferBody'), t('family.member.transfer'), () => {
      void run(() => transferOwnership(id, member.id), t('family.member.transferred'));
    });

  const onLeave = () =>
    confirm(t('family.leaveTitle'), t('family.leaveBody'), t('family.leave'), () => {
      void run(() => leaveFamily(id), t('family.left')).then((ok) => ok && router.replace('/family'));
    });

  const onDelete = () =>
    confirm(t('family.deleteTitle'), t('family.deleteBody'), t('family.delete'), () => {
      void run(() => deleteFamily(id), t('family.deleted'), 'family').then((ok) => ok && router.replace('/family'));
    });

  const onUnshare = (tx: SharedTransaction) =>
    confirm(t('family.shared.unshareTitle'), t('family.shared.unshareBody'), t('family.shared.unshare'), () => {
      void run(() => unshareTransaction(tx.id, id), t('family.shared.unshared'), 'share');
    });

  const onRevoke = (invitationId: string) => {
    void run(() => revokeInvitation(id, invitationId), t('family.invitation.revoked'));
  };

  if (detail.family.status === 'loading') {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        <StatusBar style="dark" />
        <FamilyHeader title="" fallback="/family" />
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      </SafeAreaView>
    );
  }
  if (!family) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        <StatusBar style="dark" />
        <FamilyHeader title={t('family.title')} fallback="/family" />
        <View style={styles.message}>
          <AppText weight="medium" style={styles.messageText}>
            {t('family.loadError')}
          </AppText>
          <PrimaryButton label={t('budget.retry')} onPress={detail.family.retry} />
        </View>
      </SafeAreaView>
    );
  }

  const utilization = detail.utilization.data;
  const budget = dashboard?.budget;
  const month = dashboard
    ? `${monthName(Number(dashboard.month.slice(5)), Number(dashboard.month.slice(0, 4)), language)} ${dashboard.month.slice(0, 4)}`
    : '';

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <FamilyHeader title={family.name} subtitle={`${t(`family.role.${family.myRole}`)} · ${family.currency}`} fallback="/family" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={detail.family.refreshing} onRefresh={() => detail.reloadAll()} />}>
        {family.description ? <AppText style={styles.description}>{family.description}</AppText> : null}

        <InfoCard
          title={`${t('family.summary')}${month ? ` · ${month}` : ''}`}
          note={detail.dashboard.status === 'error' && !dashboard ? t('family.sectionUnavailable') : null}>
          {dashboard && (
            <>
              <AppText weight="bold" style={styles.hero} numberOfLines={1} adjustsFontSizeToFit>
                {money(dashboard.totalShared, dashboard.currency)}
              </AppText>
              <Line label={t('family.sharedCount')} value={String(dashboard.sharedCount)} />
              <Line label={t('family.activeMembers')} value={String(dashboard.activeMembers)} />
              {dashboard.changePercent !== null && (
                <Line
                  label={t('family.vsLastMonth')}
                  value={`${dashboard.changePercent > 0 ? '+' : ''}${dashboard.changePercent}%`}
                />
              )}
              {dashboard.otherCurrencies.length > 0 && (
                <AppText style={styles.note}>
                  {t('family.otherCurrencies', {
                    list: dashboard.otherCurrencies.map((c) => `${c.currency} (${c.count})`).join(', '),
                    currency: dashboard.currency,
                  })}
                </AppText>
              )}
            </>
          )}
        </InfoCard>

        <InfoCard
          title={t('family.budget.title')}
          note={
            budget?.state === 'none'
              ? t(perms.invite ? 'family.budget.noneManage' : 'family.budget.none')
              : budget?.state === 'unavailable' || detail.utilization.status === 'error'
                ? t('family.sectionUnavailable')
                : null
          }>
          {utilization && (
            <>
              <View style={styles.cat}>
                <View style={styles.line}>
                  <AppText weight="semibold" style={styles.value}>
                    {t('family.budget.total')}
                  </AppText>
                  <AppText style={styles.label}>{t(STATUS_LABEL[utilization.status])}</AppText>
                </View>
                <AppText style={styles.label}>
                  {t('family.budget.spentOf', {
                    spent: money(utilization.totalSpent, utilization.currency),
                    limit: money(utilization.totalLimit, utilization.currency),
                  })}
                </AppText>
                <ProgressBar percent={utilization.percent} tone={TONE[utilization.status]} />
              </View>
              {utilization.lines.map((line) => (
                <View key={line.categoryCode} style={styles.cat}>
                  <View style={styles.line}>
                    <AppText weight="semibold" style={styles.value} numberOfLines={1}>
                      {categoryName(line.categoryCode)}
                    </AppText>
                    <AppText style={styles.label}>
                      {t('family.budget.spentOf', {
                        spent: money(line.spent, utilization.currency),
                        limit: money(line.limit, utilization.currency),
                      })}
                    </AppText>
                  </View>
                  <ProgressBar percent={line.percent} tone={TONE[line.status]} />
                </View>
              ))}
            </>
          )}
        </InfoCard>

        {dashboard && dashboard.categories.length > 0 && (
          <InfoCard title={t('family.categories')}>
            {dashboard.categories.map((c) => {
              const app = categoryFromCode(c.categoryCode) ?? c.categoryCode;
              return (
                <View key={c.categoryCode} style={styles.cat}>
                  <View style={styles.line}>
                    <AppText weight="semibold" style={styles.value} numberOfLines={1}>
                      {categoryName(c.categoryCode)}
                    </AppText>
                    <AppText style={styles.label}>{`${money(c.total, dashboard.currency)} · ${Math.round(c.sharePercent)}%`}</AppText>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.min(c.sharePercent, 100)}%`, backgroundColor: categoryLook(app).tint }]} />
                  </View>
                </View>
              );
            })}
          </InfoCard>
        )}

        <InfoCard
          title={t('family.members')}
          action={perms.invite ? { label: t('family.invite.title'), onPress: () => router.push({ pathname: '/family-invite', params: { id } }) } : undefined}
          note={detail.members.status === 'error' && !detail.members.data ? t('family.sectionUnavailable') : null}>
          {(detail.members.data ?? []).map((member) => {
            const mine = member.userId === myUserId;
            const remove = perms.remove && canRemoveMember(detail.role, member, myUserId);
            return (
              <View key={member.id} style={styles.member}>
                <View style={styles.line}>
                  <AppText weight="semibold" style={styles.value}>
                    {mine ? t('family.you') : memberTag(member.userId)}
                  </AppText>
                  <View style={styles.badge}>
                    <AppText weight="semibold" style={styles.badgeText}>
                      {t(`family.role.${member.role}`)}
                    </AppText>
                  </View>
                </View>
                {!mine && member.role !== 'OWNER' && (perms.changeRole || remove) && (
                  <View style={styles.actions}>
                    {perms.changeRole && (
                      <>
                        <TextButton
                          label={t(member.role === 'ADMIN' ? 'family.member.makeMember' : 'family.member.makeAdmin')}
                          onPress={() => onRole(member)}
                          disabled={busy}
                        />
                        <TextButton label={t('family.member.makeOwner')} onPress={() => onTransfer(member)} disabled={busy} />
                      </>
                    )}
                    {remove && <TextButton label={t('family.member.remove')} onPress={() => onRemove(member)} disabled={busy} danger />}
                  </View>
                )}
              </View>
            );
          })}
        </InfoCard>

        {perms.invite && (detail.invitations.data ?? []).length > 0 && (
          <InfoCard title={t('family.pendingInvitations')}>
            {(detail.invitations.data ?? []).map((invitation) => (
              <View key={invitation.id} style={styles.line}>
                <View style={styles.grow}>
                  <AppText weight="semibold" style={styles.value}>
                    {who(invitation.invitedUserId)}
                  </AppText>
                  <AppText style={styles.note}>{t(`family.role.${invitation.role}`)}</AppText>
                </View>
                <TextButton label={t('family.invitation.revoke')} onPress={() => onRevoke(invitation.id)} disabled={busy} danger />
              </View>
            ))}
          </InfoCard>
        )}

        <InfoCard
          title={t('family.shared.title')}
          note={
            detail.shared.status === 'error' && detail.shared.items.length === 0
              ? t('family.sectionUnavailable')
              : detail.shared.status === 'ready' && detail.shared.items.length === 0
                ? t('family.shared.empty')
                : null
          }>
          {detail.shared.items.map((tx) => (
            <View key={tx.id} style={styles.tx}>
              <View style={styles.line}>
                <AppText weight="semibold" style={styles.value} numberOfLines={1}>
                  {tx.merchant ?? categoryName(tx.categoryCode)}
                </AppText>
                <AppText weight="semibold" style={styles.value}>
                  {money(tx.amount, tx.currency)}
                </AppText>
              </View>
              <View style={styles.line}>
                <AppText style={styles.note} numberOfLines={1}>
                  {`${day.format(tx.date)} · ${categoryName(tx.categoryCode)} · ${t('family.shared.by', { who: who(tx.sharedBy) })}`}
                </AppText>
                {tx.sharedBy === myUserId && <TextButton label={t('family.shared.unshare')} onPress={() => onUnshare(tx)} disabled={busy} danger />}
              </View>
            </View>
          ))}
          {detail.shared.hasMore && (
            <TextButton label={detail.shared.loadingMore ? t('family.shared.loading') : t('family.shared.more')} onPress={detail.shared.more} disabled={detail.shared.loadingMore} />
          )}
        </InfoCard>

        {(perms.leave || perms.delete) && (
          <View style={styles.dangerZone}>
            {perms.leave && <PrimaryButton label={t('family.leave')} onPress={onLeave} disabled={busy} />}
            {perms.delete && <TextButton label={t('family.delete')} onPress={onDelete} disabled={busy} danger />}
            {family.myRole === 'OWNER' && <AppText style={styles.note}>{t('family.ownerNote')}</AppText>}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line} accessible accessibilityLabel={`${label}, ${value}`}>
      <AppText style={styles.label}>{label}</AppText>
      <AppText weight="semibold" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

function TextButton({ label, onPress, disabled, danger }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" hitSlop={spacing.sm} style={disabled && styles.disabled}>
      <AppText weight="semibold" style={[styles.textButton, danger && styles.danger]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  spinner: { marginTop: spacing.xxxl },
  message: { gap: spacing.lg, alignItems: 'center', padding: spacing.xl, paddingVertical: spacing.xxxl },
  messageText: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  description: { fontSize: fontSizes.sm, color: colors.textSecondary },
  hero: { fontSize: fontSizes.xxl, color: colors.textPrimary },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  grow: { flex: 1 },
  label: { fontSize: fontSizes.sm, color: colors.textSecondary },
  value: { flexShrink: 1, fontSize: fontSizes.sm, color: colors.textPrimary },
  note: { flexShrink: 1, fontSize: fontSizes.xs, color: colors.textSecondary },
  cat: { gap: spacing.xs },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  member: { gap: spacing.xs, paddingVertical: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  badgeText: { fontSize: fontSizes.xs, color: colors.primary },
  tx: { gap: spacing.xxs, paddingVertical: spacing.xs },
  textButton: { fontSize: fontSizes.sm, color: colors.primary },
  danger: { color: colors.danger },
  dangerZone: { gap: spacing.md, alignItems: 'center' },
  disabled: { opacity: 0.4 },
});
