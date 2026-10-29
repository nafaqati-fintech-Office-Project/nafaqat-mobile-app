import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { FilterTabs } from '@/features/transactions/FilterTabs';
import { daysAgo, groupByDay, type DaySection } from '@/features/transactions/groupByDay';
import { SearchBar } from '@/features/transactions/SearchBar';
import { TransactionListItem } from '@/features/transactions/TransactionListItem';
import { TransactionsHeader } from '@/features/transactions/TransactionsHeader';
import type { TransactionFilter, TransactionItem } from '@/features/transactions/transactionsApi';
import { useTransactionHighlight } from '@/features/transactions/useTransactionHighlight';
import { deleteProblem, removeTransaction, type DeleteProblem } from '@/features/transactions/transactionsService';
import { useTransactionList } from '@/features/transactions/useTransactionList';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';

// Lets the list lay out its rows before scrolling to one.
const SCROLL_DELAY_MS = 150;

const DELETE_PROBLEM: Record<Exclude<DeleteProblem, 'gone'>, TranslationKey> = {
  notDeletable: 'transactions.cash.notDeletable',
  network: 'errors.network',
  unknown: 'transactions.cash.deleteFailed',
};

export default function TransactionsRoute() {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const list = useTransactionList(filter, query);
  const sections = useMemo(() => groupByDay(list.items), [list.items]);
  const listRef = useRef<SectionList<TransactionItem, DaySection<TransactionItem>>>(null);

  // Opened from a notification: point out that transaction.
  const params = useLocalSearchParams<{ highlight?: string; at?: string }>();
  const request = useMemo(
    () => (params.highlight ? { id: params.highlight, key: `${params.highlight}:${params.at ?? ''}` } : null),
    [params.highlight, params.at],
  );
  // A new request shows the whole list, since a search or filter could hide the row.
  const [handledKey, setHandledKey] = useState<string | null>(null);
  if (request && request.key !== handledKey) {
    setHandledKey(request.key);
    setQuery('');
    setFilter('all');
  }
  const showingAll = filter === 'all' && list.appliedSearch === '' && list.status === 'ready';
  const onMissing = useCallback(() => showToast(t('transactions.notFound')), [t]);
  const highlight = useTransactionHighlight(request, list.items, showingAll, onMissing);

  // Scrolls to the row once it is loaded; once per request.
  const scrolledKey = useRef<string | null>(null);
  const target = useRef<{ sectionIndex: number; itemIndex: number } | null>(null);
  useEffect(() => {
    if (!request || !highlight.inList || scrolledKey.current === request.key) return;
    const sectionIndex = sections.findIndex((section) => section.data.some((row) => row.id === request.id));
    if (sectionIndex < 0) return;
    // itemIndex counts the section header as 0.
    target.current = { sectionIndex, itemIndex: sections[sectionIndex].data.findIndex((row) => row.id === request.id) + 1 };
    const timer = setTimeout(() => {
      scrolledKey.current = request.key;
      if (target.current) listRef.current?.scrollToLocation({ ...target.current, viewPosition: 0.4 });
    }, SCROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [request, highlight.inList, sections]);

  // A row far down is not measured yet: jump near it, then try again.
  const onScrollFailed = (info: { averageItemLength: number; index: number }) => {
    listRef.current?.getScrollResponder()?.scrollTo({ y: info.averageItemLength * info.index, animated: true });
    setTimeout(() => {
      if (target.current) listRef.current?.scrollToLocation({ ...target.current, viewPosition: 0.4 });
    }, SCROLL_DELAY_MS * 2);
  };

  const pinned = highlight.pinned && request && (
    <View style={styles.pinned}>
      <View style={styles.pinnedHead}>
        <AppText weight="semibold" style={styles.pinnedTitle}>
          {t('transactions.fromNotification')}
        </AppText>
        <Pressable
          onPress={() => router.setParams({ highlight: '', at: '' })}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={t('transactions.closePinned')}>
          <Icon name="close" color={colors.textSecondary} size={sizes.icon} />
        </Pressable>
      </View>
      <TransactionListItem item={highlight.pinned} showDay flashKey={`${request.key}:pinned`} />
    </View>
  );

  // Coming back to the tab picks up rows the SMS sync sent meanwhile; the first focus is the initial load.
  const focused = useRef(false);
  const { reloadSilently } = list;
  useFocusEffect(
    useCallback(() => {
      if (focused.current) void reloadSilently();
      focused.current = true;
    }, [reloadSilently]),
  );

  // Only cash expenses entered by hand can be deleted; bank transactions stay as the bank reported them.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { remove } = list;
  const deleteRow = async (item: TransactionItem) => {
    setDeletingId(item.id);
    try {
      await removeTransaction(item.id);
      remove(item.id);
      showToast(t('transactions.cash.deleted'));
    } catch (error) {
      const problem = deleteProblem(error);
      if (problem === 'gone') remove(item.id);
      else showToast(t(DELETE_PROBLEM[problem]));
    } finally {
      setDeletingId(null);
    }
    void reloadSilently();
  };
  const confirmDelete = (item: TransactionItem) =>
    Alert.alert(t('transactions.cash.deleteTitle'), t('transactions.cash.deleteBody'), [
      { text: t('notifications.cancel'), style: 'cancel' },
      { text: t('transactions.cash.delete'), style: 'destructive', onPress: () => void deleteRow(item) },
    ]);
  const actionFor = (item: TransactionItem) =>
    item.manual && deletingId === null ? () => confirmDelete(item) : undefined;

  const sectionTitle = (date: Date) => {
    const ago = daysAgo(date);
    if (ago === 0) return t('transactions.today');
    if (ago === 1) return t('transactions.yesterday');
    return new Intl.DateTimeFormat(intlLocale(language), { dateStyle: 'medium' }).format(date);
  };

  const empty =
    list.status === 'loading' ? (
      <ActivityIndicator color={colors.primary} style={styles.spinner} />
    ) : list.status === 'error' ? (
      <View style={styles.error}>
        <AppText weight="medium" style={styles.errorText}>
          {t('transactions.loadError')}
        </AppText>
        <PrimaryButton label={t('transactions.retry')} onPress={list.retry} />
      </View>
    ) : (
      <AppText style={styles.empty}>
        {query.trim() || filter !== 'all' ? t('transactions.noResults') : t('transactions.empty')}
      </AppText>
    );

  const footer = list.loadingMore ? (
    <ActivityIndicator color={colors.primary} style={styles.footer} />
  ) : list.moreFailed ? (
    <Pressable onPress={list.loadMore} accessibilityRole="button" style={styles.footer}>
      <AppText weight="medium" style={styles.moreFailed}>
        {t('transactions.loadMoreFailed')}
      </AppText>
    </Pressable>
  ) : undefined;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.top}>
        <TransactionsHeader onAdd={() => router.push('/transaction-add')} />
        <SearchBar value={query} onChangeText={setQuery} />
        <FilterTabs value={filter} onChange={setFilter} />
      </View>
      <SectionList
        ref={listRef}
        sections={list.status === 'ready' ? sections : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
        onEndReached={list.moreFailed ? undefined : list.loadMore}
        onEndReachedThreshold={0.5}
        renderSectionHeader={({ section }) => (
          <AppText weight="bold" style={styles.section}>
            {sectionTitle(section.date)}
          </AppText>
        )}
        renderItem={({ item }) => (
          <TransactionListItem
            item={item}
            flashKey={request && highlight.inList && item.id === request.id ? request.key : null}
            onPress={actionFor(item)}
            busy={deletingId === item.id}
          />
        )}
        onScrollToIndexFailed={onScrollFailed}
        ListHeaderComponent={pinned || undefined}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  top: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  list: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  section: { fontSize: fontSizes.md, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.xs },
  spinner: { marginTop: spacing.xxxl },
  error: { gap: spacing.lg, paddingVertical: spacing.xxl },
  errorText: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  empty: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
  footer: { paddingVertical: spacing.lg, alignItems: 'center' },
  moreFailed: { fontSize: fontSizes.sm, color: colors.primary },
  pinned: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinnedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pinnedTitle: { fontSize: fontSizes.xs, color: colors.textSecondary },
});
