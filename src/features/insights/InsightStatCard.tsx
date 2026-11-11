import { StyleSheet, View } from 'react-native';

import { ChangeChip } from './ChangeChip';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { DrillPressable } from '@/features/transactions/DrillPressable';
import type { TransactionLink } from '@/features/transactions/transactionLinks';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';

type Props = {
  icon: IconName;
  tint: string;
  tintSoft: string;
  label: string;
  value: string;
  changePercent: number | null;
  goodWhen: 'up' | 'down';
  // Opens the transactions behind the number.
  link?: TransactionLink | null;
};

export function InsightStatCard({ icon, tint, tintSoft, label, value, changePercent, goodWhen, link = null }: Props) {
  return (
    <DrillPressable link={link} style={styles.card} label={`${label}, ${value}`}>
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
    </DrillPressable>
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
