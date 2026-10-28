import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';

export type SegmentedOption<T extends string> = { value: T; label: TranslationKey };

type Props<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

// Equal-width pills; the selected one is filled.
export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
  const { t } = useLanguage();

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active && styles.tabActive]}>
            <AppText weight="medium" style={[styles.label, active && styles.labelActive]}>
              {t(option.label)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: fontSizes.sm, color: colors.textPrimary },
  labelActive: { color: colors.white },
});
