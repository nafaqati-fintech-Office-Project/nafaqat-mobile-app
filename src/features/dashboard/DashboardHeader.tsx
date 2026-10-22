import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

export function DashboardHeader() {
  const { t } = useLanguage();

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <Logo size={sizes.logoHeader} />
        <AppText weight="bold" style={styles.name}>
          {t('appName')}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dashboard.notifications')}
        style={styles.bell}>
        <Icon name="bell" color={colors.textPrimary} size={sizes.iconLg} />
        <View style={styles.dot} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: fontSizes.lg, color: colors.textPrimary },
  bell: { width: sizes.bell, height: sizes.bell, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: spacing.sm,
    end: spacing.sm + spacing.xs,
    width: sizes.bellDot,
    height: sizes.bellDot,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.bgLight,
  },
});
