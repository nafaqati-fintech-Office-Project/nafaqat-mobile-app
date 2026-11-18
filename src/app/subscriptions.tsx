import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { screenTitle } from '@/components/screenTitle';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SegmentedTabs, type SegmentedOption } from '@/components/SegmentedTabs';
import { showToast } from '@/components/Toast';
import { ReviewCard } from '@/features/subscriptions/ReviewCard';
import { viewOf } from '@/features/subscriptions/subscriptionMath';
import { SubscriptionInsights } from '@/features/subscriptions/SubscriptionInsights';
import { SubscriptionRow } from '@/features/subscriptions/SubscriptionRow';
import { actionProblem, type ActionProblem } from '@/features/subscriptions/subscriptionsService';
import { SubscriptionSummaryCards } from '@/features/subscriptions/SubscriptionSummaryCards';
import type { Subscription } from '@/features/subscriptions/types';
import { openTransactions } from '@/features/transactions/transactionLinks';
import { useSubscriptions } from '@/features/subscriptions/useSubscriptions';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';

type Tab = 'active' | 'ended';
type Action = 'confirm' | 'dismiss' | 'end';

const PROBLEM: Record<ActionProblem, TranslationKey> = {
  duplicate: 'subscriptions.problem.unknown',
  notAllowed: 'subscriptions.problem.notAllowed',
  network: 'errors.network',
  unknown: 'subscriptions.problem.unknown',
};

const DONE: Record<Action, TranslationKey> = {
  confirm: 'subscriptions.confirmed',
  dismiss: 'subscriptions.dismissed',
  end: 'subscriptions.endedDone',
};

export default function SubscriptionsRoute() {
  const { t, isRTL } = useLanguage();
  const { loaded, status, refreshing, busyId, refresh, retry, reload, run } = useSubscriptions();
  const [tab, setTab] = useState<Tab>('active');
  const [onlyAttention, setOnlyAttention] = useState(false);
  const view = useMemo(() => (loaded ? viewOf(loaded.data, loaded.preferred) : null), [loaded]);

  // Coming back (from adding one) shows the change; the first focus is the initial load.
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) void reload();
      focused.current = true;
    }, [reload]),
  );

  const perform = async (item: Subscription, action: Action) => {
    try {
      await run(item.id, action);
      showToast(t(DONE[action], { name: item.name }));
    } catch (error) {
      showToast(t(PROBLEM[actionProblem(error)]));
    }
  };

  // Dismissing is final (the service stops tracking that merchant), so it asks first.
  const dismiss = (item: Subscription) =>
    Alert.alert(t('subscriptions.dismissTitle', { name: item.name }), t('subscriptions.dismissBody'), [
      { text: t('notifications.cancel'), style: 'cancel' },
      { text: t('subscriptions.notSubscription'), style: 'destructive', onPress: () => void perform(item, 'dismiss') },
    ]);

  // An active one: end it (stopped paying; a new charge brings it back) or say it was never a subscription.
  // Its charges: the bank SMS name the merchant, so the list is searched for it.
  const payments = (item: Subscription) =>
    openTransactions({ type: 'expenses', q: item.name, title: `${item.name} · ${t('subscriptions.payments')}` });
  // Android shows at most three buttons, so there the dialog is closed by tapping outside instead of Cancel.
  const manage = (item: Subscription) =>
    Alert.alert(
      item.name,
      t('subscriptions.manageBody'),
      [
        { text: t('subscriptions.payments'), onPress: () => payments(item) },
        { text: t('subscriptions.markEnded'), onPress: () => void perform(item, 'end') },
        { text: t('subscriptions.notSubscription'), style: 'destructive', onPress: () => dismiss(item) },
        ...(Platform.OS === 'android' ? [] : [{ text: t('notifications.cancel'), style: 'cancel' as const }]),
      ],
      { cancelable: true },
    );

  const tabs: SegmentedOption<Tab>[] = view
    ? [
        { value: 'active', label: 'subscriptions.active', count: view.active.length },
        { value: 'ended', label: 'subscriptions.ended', count: view.ended.length },
      ]
    : [];
  const rows = !view ? [] : tab === 'ended' ? view.ended : onlyAttention ? view.attention : view.active;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          accessibilityRole="button"
          accessibilityLabel={t('budget.back')}
          style={styles.side}>
          {/* The chevron points right; flip it to point back in left-to-right layouts. */}
          <View style={!isRTL && styles.flip}>
            <Icon name="chevron" color={colors.textPrimary} size={sizes.iconLg} />
          </View>
        </Pressable>
        <View style={styles.titles}>
          <AppText weight="bold" style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
            {t('subscriptions.title')}
          </AppText>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/subscription-add', params: { currency: view?.currency ?? '' } })}
          accessibilityRole="button"
          accessibilityLabel={t('subscriptions.addTitle')}
          style={styles.add}>
          <AppText weight="bold" style={styles.addText}>
            {`+ ${t('subscriptions.add')}`}
          </AppText>
        </Pressable>
      </View>
      <AppText style={styles.subtitle}>{t('subscriptions.subtitle')}</AppText>

      {status === 'loading' ? (
        <View style={styles.message}>
          <ActivityIndicator color={colors.primary} />
          {/* The first visit can take a while: the service reads the user's transaction history. */}
          <AppText style={styles.messageBody}>{t('subscriptions.loading')}</AppText>
        </View>
      ) : status === 'error' || !view || !loaded ? (
        <View style={styles.message}>
          <AppText weight="medium" style={styles.messageTitle}>
            {t('subscriptions.loadError')}
          </AppText>
          <PrimaryButton label={t('budget.retry')} onPress={retry} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
          {(loaded.data.syncStatus === 'IN_PROGRESS' || loaded.data.syncStatus === 'NOT_STARTED') && (
            <AppText style={styles.syncNote}>{t('subscriptions.syncing')}</AppText>
          )}

          <SubscriptionSummaryCards
            view={view}
            showingAttention={onlyAttention}
            onToggleAttention={() => {
              setTab('active');
              setOnlyAttention((current) => !current);
            }}
          />

          <ReviewCard
            items={view.review}
            busyId={busyId}
            onConfirm={(item) => void perform(item, 'confirm')}
            onDismiss={dismiss}
          />

          <SegmentedTabs
            options={tabs}
            value={tab}
            onChange={(next) => {
              setTab(next);
              setOnlyAttention(false);
            }}
          />

          <View style={styles.list}>
            {onlyAttention && tab === 'active' && (
              <AppText style={styles.filterNote}>{t('subscriptions.attentionNote')}</AppText>
            )}
            {rows.length > 0 ? (
              rows.map((item, index) => (
                <View key={item.id} style={index > 0 && styles.divider}>
                  <SubscriptionRow
                    item={item}
                    busy={busyId === item.id}
                    onPress={
                      busyId !== null ? undefined : item.status === 'CONFIRMED' ? () => manage(item) : () => payments(item)
                    }
                  />
                </View>
              ))
            ) : (
              <AppText style={styles.empty}>
                {t(tab === 'active' ? 'subscriptions.emptyActive' : 'subscriptions.emptyEnded')}
              </AppText>
            )}
          </View>

          <SubscriptionInsights view={view} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg },
  side: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  titles: { flex: 1 },
  title: { ...screenTitle },
  subtitle: { fontSize: fontSizes.xs, color: colors.textSecondary, paddingHorizontal: spacing.xl },
  add: {
    minHeight: sizes.touchMin - spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  addText: { fontSize: fontSizes.sm, color: colors.white },
  message: { gap: spacing.lg, alignItems: 'center', padding: spacing.xl, paddingVertical: spacing.xxxl },
  messageTitle: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  messageBody: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  syncNote: { fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center' },
  list: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  filterNote: { fontSize: fontSizes.xs, color: colors.orange, paddingTop: spacing.md },
  empty: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl },
});
