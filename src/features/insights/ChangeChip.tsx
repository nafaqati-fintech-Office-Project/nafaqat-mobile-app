import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

type Props = {
  // null: nothing to compare against, so no chip.
  percent: number | null;
  // Which direction is good news: savings going up, spending going down.
  goodWhen: 'up' | 'down';
};

export function ChangeChip({ percent, goodWhen }: Props) {
  const { t } = useLanguage();
  if (percent === null) return null;
  const label = `${Math.abs(percent)}%`;

  if (percent === 0) {
    return (
      <View style={[styles.chip, { backgroundColor: colors.border }]} accessible accessibilityLabel={t('insights.noChange')}>
        <AppText weight="semibold" style={[styles.text, { color: colors.textSecondary }]}>
          {label}
        </AppText>
      </View>
    );
  }

  const up = percent > 0;
  const good = up === (goodWhen === 'up');
  const tone = good ? colors.success : colors.danger;

  return (
    <View
      style={[styles.chip, { backgroundColor: good ? colors.successSoft : colors.dangerSoft }]}
      accessible
      accessibilityLabel={`${t(up ? 'insights.changeUp' : 'insights.changeDown')} ${label}`}>
      <Icon name={up ? 'arrowUp' : 'arrowDown'} color={tone} size={sizes.icon - 4} />
      <AppText weight="semibold" style={[styles.text, { color: tone }]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xxs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  text: { fontSize: fontSizes.xs },
});
