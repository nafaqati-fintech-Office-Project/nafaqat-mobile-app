import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, lineHeights, radius, sizes, spacing } from '@/theme';

const MORNING_END = 12;
const AFTERNOON_END = 17;

export function greetingKey(hour: number): TranslationKey {
  if (hour < MORNING_END) return 'greeting.morning';
  if (hour < AFTERNOON_END) return 'greeting.afternoon';
  return 'greeting.evening';
}

const initials = (name: string) => name.trim().slice(0, 2).toUpperCase();

export function Greeting({ name }: { name: string }) {
  const { t } = useLanguage();

  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <AppText style={styles.hello}>{t(greetingKey(new Date().getHours()))}</AppText>
        <AppText weight="bold" style={styles.name} numberOfLines={1}>
          {name}
        </AppText>
      </View>
      <View style={styles.avatar} accessible accessibilityLabel={t('dashboard.avatar')}>
        <AppText weight="bold" style={styles.initials}>
          {initials(name)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1 },
  hello: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.textSecondary },
  name: { fontSize: fontSizes.xl, lineHeight: lineHeights.xl, color: colors.textPrimary },
  avatar: {
    width: sizes.avatar,
    height: sizes.avatar,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: fontSizes.md, color: colors.primary },
});
