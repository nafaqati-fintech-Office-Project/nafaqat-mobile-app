import { StyleSheet, View } from 'react-native';

import { categoryLabelKey, categoryTone, type CategoryTone } from './categoryDisplay';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';

const TONES: Record<CategoryTone, { background: string; text: string }> = {
  spending: { background: colors.primarySoft, text: colors.primary },
  income: { background: colors.successSoft, text: colors.success },
  transfer: { background: colors.violetSoft, text: colors.violet },
  none: { background: colors.border, text: colors.textSecondary },
};

export function CategoryChip({ category }: { category: string }) {
  const { t } = useLanguage();
  const key = categoryLabelKey(category);
  const tone = TONES[categoryTone(category)];

  return (
    <View style={[styles.chip, { backgroundColor: tone.background }]}>
      <AppText weight="medium" style={[styles.label, { color: tone.text }]} numberOfLines={1}>
        {key ? t(key) : category}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  label: { fontSize: fontSizes.xs },
});
