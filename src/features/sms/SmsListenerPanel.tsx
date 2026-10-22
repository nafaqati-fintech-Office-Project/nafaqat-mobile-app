import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { importHistory, type ImportResult } from './importHistory';
import { useSmsPipeline } from './useSmsPipeline';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';

const LOG_HEIGHT = 140;
const HISTORY_LIMIT = 500;

export function SmsListenerPanel() {
  const { t } = useLanguage();
  const { listening, log, toggle } = useSmsPipeline();
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<ImportResult | null>(null);

  const runImport = async () => {
    setImporting(true);
    try {
      setImported(await importHistory(HISTORY_LIMIT));
    } catch {
      setImported(null);
    } finally {
      setImporting(false);
    }
  };

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
      <PrimaryButton label={t('sms.debug.import')} onPress={runImport} loading={importing} />
      {imported && (
        <AppText style={styles.entry}>
          {`${t('sms.debug.imported')} ${imported.scanned} / ${imported.saved} / ${imported.skipped}`}
        </AppText>
      )}
      {log.length > 0 && (
        <ScrollView style={styles.log} nestedScrollEnabled>
          {log.map((item) => (
            <AppText key={`${item.id}-${item.time}`} style={styles.entry}>
              {[
                new Date(item.time).toLocaleTimeString('en-GB'),
                `${t('sms.debug.parsedFlag')} ${item.parsed ? 'Y' : 'N'}`,
                item.duplicate ? 'duplicate' : null,
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
