import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontFamily, fontSizes, radius, sizes, spacing } from '@/theme';

type Props = { value: string; onChangeText: (text: string) => void };

export function SearchBar({ value, onChangeText }: Props) {
  const { t } = useLanguage();

  return (
    <View style={styles.bar}>
      <Icon name="search" color={colors.textSecondary} size={sizes.icon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={t('transactions.search')}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        style={styles.input}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel={t('transactions.clearSearch')}
          hitSlop={spacing.sm}>
          <Icon name="close" color={colors.textSecondary} size={sizes.icon} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: sizes.touchMin,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgLight,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontFamily: fontFamily('regular'),
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
});
