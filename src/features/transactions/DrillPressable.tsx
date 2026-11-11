import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { openTransactions, type TransactionLink } from './transactionLinks';
import { useLanguage } from '@/i18n/LanguageProvider';

type Props = {
  // null: nothing to open (e.g. a category the server cannot filter by); renders a plain View.
  link: TransactionLink | null;
  // Read by screen readers instead of the children.
  label?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

// A card, row or bar that opens the Transactions tab filtered to what it shows.
export function DrillPressable({ link, label, style, children }: Props) {
  const { t } = useLanguage();
  if (!link) {
    return (
      <View style={style} accessible={Boolean(label)} accessibilityLabel={label}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => openTransactions(link)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t('transactions.openHint')}
      style={({ pressed }) => [style, pressed && { opacity: 0.6 }]}>
      {children}
    </Pressable>
  );
}
