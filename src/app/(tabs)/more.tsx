import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { screenTitle, screenTitleRow } from '@/components/screenTitle';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { usePlan } from '@/features/plans/usePlan';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

export default function MoreRoute() {
  const { t, language, isRTL } = useLanguage();
  const { signOut } = useAuth();
  const { plan } = usePlan();

  const onSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.titleRow}>
        <AppText weight="bold" style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          {t('tabs.more')}
        </AppText>
      </View>
      <Pressable
        onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityLabel={t('more.profile')}
        style={styles.row}>
        <AppText weight="medium" style={styles.rowLabel}>
          {t('more.profile')}
        </AppText>
        <View style={isRTL && styles.flip}>
          <Icon name="chevron" color={colors.textSecondary} size={sizes.icon} />
        </View>
      </Pressable>
      <Pressable
        onPress={() => router.push('/plans')}
        accessibilityRole="button"
        accessibilityLabel={t('plans.title')}
        style={styles.row}>
        <Icon name="star" color={colors.violet} size={sizes.icon} />
        <AppText weight="medium" style={styles.rowLabel}>
          {t('more.plan')}
        </AppText>
        {plan && <AppText style={styles.rowValue}>{t(plan === 'premium' ? 'plans.premium' : 'plans.free')}</AppText>}
        <View style={isRTL && styles.flip}>
          <Icon name="chevron" color={colors.textSecondary} size={sizes.icon} />
        </View>
      </Pressable>
      <Pressable
        onPress={() => router.push('/reports')}
        accessibilityRole="button"
        accessibilityLabel={t('reports.title')}
        style={styles.row}>
        <Icon name="insights" color={colors.primary} size={sizes.icon} />
        <AppText weight="medium" style={styles.rowLabel}>
          {t('reports.title')}
        </AppText>
        <View style={isRTL && styles.flip}>
          <Icon name="chevron" color={colors.textSecondary} size={sizes.icon} />
        </View>
      </Pressable>
      <Pressable
        onPress={() => router.push('/goals')}
        accessibilityRole="button"
        accessibilityLabel={t('goals.title')}
        style={styles.row}>
        <Icon name="savings" color={colors.primary} size={sizes.icon} />
        <AppText weight="medium" style={styles.rowLabel}>
          {t('goals.title')}
        </AppText>
        <View style={isRTL && styles.flip}>
          <Icon name="chevron" color={colors.textSecondary} size={sizes.icon} />
        </View>
      </Pressable>
      <Pressable
        onPress={() => router.push('/family')}
        accessibilityRole="button"
        accessibilityLabel={t('family.title')}
        style={styles.row}>
        <Icon name="home" color={colors.primary} size={sizes.icon} />
        <AppText weight="medium" style={styles.rowLabel}>
          {t('family.title')}
        </AppText>
        <View style={isRTL && styles.flip}>
          <Icon name="chevron" color={colors.textSecondary} size={sizes.icon} />
        </View>
      </Pressable>
      <Pressable
        onPress={() => router.push('/language')}
        accessibilityRole="button"
        accessibilityLabel={t('more.language')}
        style={styles.row}>
        <AppText weight="medium" style={styles.rowLabel}>
          {t('more.language')}
        </AppText>
        <AppText style={styles.rowValue}>{t(`language.${language}.title`)}</AppText>
        <View style={isRTL && styles.flip}>
          <Icon name="chevron" color={colors.textSecondary} size={sizes.icon} />
        </View>
      </Pressable>
      {(Platform.OS === 'ios' || __DEV__) && (
        <Pressable
          onPress={() => router.push('/ios-sms-setup')}
          accessibilityRole="button"
          accessibilityLabel={t('iosSetup.more')}
          style={styles.row}>
          <Icon name="sms" color={colors.primary} size={sizes.icon} />
          <AppText weight="medium" style={styles.rowLabel}>
            {t('iosSetup.more')}
          </AppText>
          <View style={isRTL && styles.flip}>
            <Icon name="chevron" color={colors.textSecondary} size={sizes.icon} />
          </View>
        </Pressable>
      )}
      <Pressable
        onPress={() => router.push('/notification-settings')}
        accessibilityRole="button"
        accessibilityLabel={t('notifications.settings')}
        style={styles.row}>
        <AppText weight="medium" style={styles.rowLabel}>
          {t('notifications.settings')}
        </AppText>
        <View style={isRTL && styles.flip}>
          <Icon name="chevron" color={colors.textSecondary} size={sizes.icon} />
        </View>
      </Pressable>
      <View style={styles.footer}>
        <Pressable
          onPress={() => router.push('/delete-account')}
          accessibilityRole="button"
          accessibilityLabel={t('more.deleteAccount')}
          style={styles.deleteRow}>
          <AppText weight="semibold" style={styles.deleteText}>
            {t('more.deleteAccount')}
          </AppText>
        </Pressable>
        <PrimaryButton label={t('more.signOut')} onPress={onSignOut} />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgLight },
  screen: { flexGrow: 1, padding: spacing.xl, paddingTop: 0, gap: spacing.lg },
  titleRow: { ...screenTitleRow },
  title: { ...screenTitle },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.button,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  rowLabel: { flex: 1, fontSize: fontSizes.md, color: colors.textPrimary },
  rowValue: { fontSize: fontSizes.sm, color: colors.textSecondary },
  flip: { transform: [{ scaleX: -1 }] },
  footer: { marginTop: 'auto', gap: spacing.sm },
  deleteRow: { minHeight: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: fontSizes.sm, color: colors.danger },
});
