import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import {
  listTransactions,
  onTransactionsChanged,
  type StoredTransaction,
} from '@/features/transactions/transactionsRepo';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, spacing } from '@/theme';

export default function TransactionsRoute() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<StoredTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    listTransactions()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useFocusEffect(load);
  // A background retry can re-categorize rows while this screen is open.
  useEffect(() => onTransactionsChanged(load), [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setRows(await listTransactions());
    } catch {
      setRows([]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <AppText weight="bold" style={styles.title}>
        {t('tabs.transactions')}
      </AppText>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<AppText style={styles.empty}>{t('transactions.empty')}</AppText>}
        renderItem={({ item }) => <TransactionRow item={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight, paddingHorizontal: spacing.xl },
  title: { fontSize: fontSizes.xl, color: colors.textPrimary, paddingVertical: spacing.lg },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
});
