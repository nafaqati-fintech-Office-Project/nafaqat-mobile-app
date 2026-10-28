import { StyleSheet, View } from 'react-native';

import { ChangeChip } from './ChangeChip';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';

type Props = {
  icon: IconName;
  tint: string;
  tintSoft: string;
  label: string;
  value: string;
  changePercent: number;
  goodWhen: 'up' | 'down';
};

export function InsightStatCard({ icon, tint, tintSoft, label, value, changePercent, goodWhen }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.tile, { backgroundColor: tintSoft }]}>
          <Icon name={icon} color={tint} size={sizes.iconLg} />
        </View>
        <AppText style={styles.label} numberOfLines={2}>
          {label}
        </AppText>
      </View>
      <AppText weight="bold" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <ChangeChip percent={changePercent} goodWhen={goodWhen} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: fontSizes.xs, color: colors.textSecondary },
  value: { fontSize: fontSizes.lg, color: colors.textPrimary },
});
