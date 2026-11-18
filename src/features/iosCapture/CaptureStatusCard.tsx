import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { countNeedingCompletion, loadStatuses, needsRetest, type AutomationStatus } from './status';
import { isCaptureAvailable } from '../../../modules/nafaqati-capture';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';

// Settings: one state per automation (Connected, Not set up, No recent messages) and when the last message arrived.
export function CaptureStatusCard() {
  const { t, language } = useLanguage();
  const [statuses, setStatuses] = useState<AutomationStatus[]>([]);
  const [incomplete, setIncomplete] = useState(0);
  const [retest, setRetest] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isCaptureAvailable()) return;
      void Promise.all([loadStatuses(), countNeedingCompletion(), needsRetest()]).then(([s, c, r]) => {
        setStatuses(s);
        setIncomplete(c);
        setRetest(r);
      });
    }, []),
  );

  if (statuses.length === 0) return null;
  const dateFormat = new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <View style={styles.card} accessibilityRole="summary">
      <AppText weight="semibold" style={styles.title}>
        {t('iosSetup.status.title')}
      </AppText>
      {statuses.map((s) => (
        <View key={s.flow} style={styles.row}>
          <View style={styles.flex}>
            <AppText weight="medium" style={styles.label}>
              {t(s.flow === 'bank' ? 'iosSetup.status.bank' : 'iosSetup.status.wallet')}
            </AppText>
            {s.lastAt !== null && (
              <AppText style={styles.sub}>{t('iosSetup.status.last', { date: dateFormat.format(new Date(s.lastAt)) })}</AppText>
            )}
          </View>
          <AppText weight="semibold" style={[styles.state, s.state === 'connected' ? styles.ok : s.state === 'noRecent' ? styles.warn : styles.off]}>
            {t(`iosSetup.status.${s.state}`)}
          </AppText>
        </View>
      ))}
      {incomplete > 0 && <AppText style={styles.warn}>{t('iosSetup.status.complete', { count: String(incomplete) })}</AppText>}
      {retest && <AppText style={styles.warn}>{t('iosSetup.status.iosUpdated')}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: fontSizes.sm, color: colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  label: { fontSize: fontSizes.sm, color: colors.textPrimary },
  sub: { fontSize: fontSizes.xs, color: colors.textSecondary },
  state: { fontSize: fontSizes.xs },
  ok: { color: colors.success },
  warn: { color: colors.danger, fontSize: fontSizes.xs },
  off: { color: colors.textSecondary },
});
