import { router } from 'expo-router';

import { DashboardSection } from './DashboardSection';
import type { DashboardData } from './types';
import { TransactionListItem } from '@/features/transactions/TransactionListItem';
import { useLanguage } from '@/i18n/LanguageProvider';

export function RecentTransactionsCard({ data }: { data: DashboardData }) {
  const { t } = useLanguage();
  const note =
    data.recentState === 'unavailable'
      ? t('dashboard.sectionUnavailable')
      : data.recent.length === 0
        ? t('dashboard.noTransactions')
        : null;

  return (
    <DashboardSection title={t('dashboard.recent')} onSeeAll={() => router.navigate('/transactions')} note={note}>
      {data.recent.map((item) => (
        <TransactionListItem key={item.id} item={item} showDay />
      ))}
    </DashboardSection>
  );
}
