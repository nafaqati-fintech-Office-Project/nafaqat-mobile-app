import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { FilterTabs } from '@/features/transactions/FilterTabs';
import { daysAgo, groupByDay } from '@/features/transactions/groupByDay';
import { SearchBar } from '@/features/transactions/SearchBar';
import { TransactionListItem } from '@/features/transactions/TransactionListItem';
import { TransactionsHeader } from '@/features/transactions/TransactionsHeader';
import type { TransactionFilter } from '@/features/transactions/transactionsApi';
import { useTransactionList } from '@/features/transactions/useTransactionList';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';

export default function TransactionsRoute() {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const list = useTransactionList(filter, query);
  const sections = useMemo(() => groupByDay(list.items), [list.items]);

  // Coming back to the tab picks up rows the SMS sync sent meanwhile; the first focus is the initial load.
  const focused = useRef(false);
  const { reloadSilently } = list;
  useFocusEffect(
    useCallback(() => {
      if (focused.current) void reloadSilently();
      focused.current = true;
    }, [reloadSilently]),
  );

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
        <TransactionsHeader />
        <SearchBar value={query} onChangeText={setQuery} />
        <FilterTabs value={filter} onChange={setFilter} />
      </View>
      <SectionList
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
        renderItem={({ item }) => <TransactionListItem item={item} />}
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
});
