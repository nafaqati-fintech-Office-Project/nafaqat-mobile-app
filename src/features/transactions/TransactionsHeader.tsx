import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, sizes, spacing } from '@/theme';

export function TransactionsHeader() {
  const { t } = useLanguage();

  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('transactions.menu')} style={styles.button}>
        <Icon name="menu" color={colors.textPrimary} size={sizes.iconLg} />
      </Pressable>
      <AppText weight="bold" style={styles.title}>
        {t('tabs.transactions')}
      </AppText>
      <View style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  button: { width: sizes.touchMin, height: sizes.touchMin, justifyContent: 'center' },
  title: { flex: 1, fontSize: fontSizes.lg, color: colors.textPrimary },
});
