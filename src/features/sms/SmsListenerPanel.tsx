import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useSmsPipeline } from './useSmsPipeline';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';

const LOG_HEIGHT = 140;

export function SmsListenerPanel() {
  const { t } = useLanguage();
  const { listening, log, toggle } = useSmsPipeline();

  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <AppText weight="medium" style={styles.label}>
          {t('sms.debug.listen')}
        </AppText>
        <Switch
          value={listening}
          onValueChange={toggle}
          trackColor={{ true: colors.primary }}
          accessibilityLabel={t('sms.debug.listen')}
        />
      </View>
      {log.length > 0 && (
        <ScrollView style={styles.log} nestedScrollEnabled>
          {log.map((item) => (
            <AppText key={`${item.id}-${item.time}`} style={styles.entry}>
              {[
                new Date(item.time).toLocaleTimeString('en-GB'),
                `${t('sms.debug.parsedFlag')} ${item.parsed ? 'Y' : 'N'}`,
                item.category,
                item.source,
              ]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: fontSizes.sm, color: colors.textPrimary },
  log: { maxHeight: LOG_HEIGHT },
  entry: { fontSize: fontSizes.xs, color: colors.textSecondary, paddingVertical: spacing.xxs },
});
