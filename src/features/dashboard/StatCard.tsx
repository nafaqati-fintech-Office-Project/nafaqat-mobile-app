import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';

type Props = {
  icon: IconName;
  tint: string;
  tintSoft: string;
  label: string;
  value: string;
  onPress?: () => void;
};

export function StatCard({ icon, tint, tintSoft, label, value, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${label}, ${value}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.tile, { backgroundColor: tintSoft }]}>
        <Icon name={icon} color={tint} size={sizes.iconLg} />
      </View>
      <AppText style={styles.label}>{label}</AppText>
      <AppText weight="bold" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  pressed: { opacity: 0.85 },
  tile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: fontSizes.sm, color: colors.textSecondary },
  value: { fontSize: fontSizes.lg, color: colors.textPrimary },
});
