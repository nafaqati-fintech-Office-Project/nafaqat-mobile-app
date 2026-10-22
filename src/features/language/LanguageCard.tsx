import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Flag } from './Flags';
import { AppText } from '@/components/AppText';
import type { Language } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';

type Props = {
  language: Language;
  selected: boolean;
  onPress: () => void;
};

export function LanguageCard({ language, selected, onPress }: Props) {
  const { t } = useLanguage();
  const title = t(`language.${language}.title`);
  const subtitle = t(`language.${language}.subtitle`);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}, ${subtitle}`}
      style={[styles.card, selected && styles.cardSelected]}>
      <Flag language={language} />
      <View style={styles.texts}>
        <AppText weight="semibold" style={styles.title}>
          {title}
        </AppText>
        <AppText style={styles.subtitle}>{subtitle}</AppText>
      </View>
      <View style={[styles.circle, selected && styles.circleSelected]}>
        {selected && (
          <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24">
            <Path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke={colors.white}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    ...shadows.card,
  },
  texts: { flex: 1, gap: spacing.xxs },
  title: { fontSize: fontSizes.md, color: colors.textPrimary },
  subtitle: { fontSize: fontSizes.sm, color: colors.textSecondary },
  circle: {
    width: sizes.checkCircle,
    height: sizes.checkCircle,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.dotInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
});
