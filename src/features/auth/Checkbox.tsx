import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function Checkbox({ label, checked, onChange }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={styles.row}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && (
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
      <AppText style={styles.label}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: sizes.touchMin },
  box: {
    width: sizes.checkbox,
    height: sizes.checkbox,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.dotInactive,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  label: { fontSize: fontSizes.sm, color: colors.textSecondary },
});
