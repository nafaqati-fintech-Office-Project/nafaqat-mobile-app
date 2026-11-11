import { Pressable, ScrollView, StyleSheet } from 'react-native';

import type { CardSummary } from './transactionsApi';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

type Props = { cards: CardSummary[]; value: string | null; onChange: (card: string | null) => void };

// Card-wise view: "All cards" and one chip per card seen in the bank SMS (bank name and last digits).
export function CardChips({ cards, value, onChange }: Props) {
  const { t } = useLanguage();
  // A card from a link that has no rows in the list yet still gets a chip, so the selection is visible
  const all = value && !cards.some((c) => c.card === value) ? [...cards, { card: value, bank: null, count: 0 }] : cards;
  const chip = (card: string | null, label: string) => {
    const on = value === card;
    return (
      <Pressable
        key={card ?? 'all'}
        onPress={() => onChange(card)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        style={[styles.chip, on && styles.chipOn]}>
        <AppText weight="medium" style={[styles.text, on && styles.textOn]} numberOfLines={1}>
          {label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel={t('transactions.cards.label')}>
      {chip(null, t('transactions.cards.all'))}
      {all.map((c) => chip(c.card, `${c.bank ? `${c.bank} ` : ''}•••• ${c.card}`))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  chip: {
    minHeight: sizes.touchMin - spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  text: { fontSize: fontSizes.sm, color: colors.textSecondary },
  textOn: { color: colors.primary },
});
