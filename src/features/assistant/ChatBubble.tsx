import { Pressable, StyleSheet, View } from 'react-native';

import type { AssistantAction, ChatMessage } from './types';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, lineHeights, radius, sizes, spacing } from '@/theme';

type Props = { message: ChatMessage; onAction: (action: AssistantAction) => void };

export function ChatBubble({ message, onAction }: Props) {
  const { t } = useLanguage();
  const mine = message.role === 'user';
  const label = (action: AssistantAction) =>
    action.id === 'add_to_goal'
      ? action.goalName
        ? t('assistant.action.add_to_goal', { goal: action.goalName })
        : t('assistant.action.add_to_goal_plain')
      : t(`assistant.action.${action.id}`);

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <AppText style={[styles.text, mine && styles.textMine]} selectable>
          {message.text}
        </AppText>
        {!mine && message.source === 'offline' ? (
          <View style={styles.note}>
            <Icon name="info" color={colors.textSecondary} size={sizes.icon - 4} />
            <AppText style={styles.noteText}>{t('assistant.offline')}</AppText>
          </View>
        ) : null}
      </View>
      {!mine && message.actions?.length ? (
        <View style={styles.actions}>
          {message.actions.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => onAction(action)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
              <AppText weight="semibold" style={styles.actionText}>
                {label(action)}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.md, maxWidth: '86%' },
  rowMine: { alignSelf: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start' },
  bubble: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: radius.lg },
  mine: { backgroundColor: colors.primary, borderBottomEndRadius: radius.sm / 2 },
  theirs: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomStartRadius: radius.sm / 2,
  },
  text: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.textPrimary, textAlign: 'auto' },
  textMine: { color: colors.white },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  noteText: { fontSize: fontSizes.xxs, color: colors.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  action: {
    minHeight: sizes.touchMin - 8,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  actionPressed: { opacity: 0.7 },
  actionText: { fontSize: fontSizes.xs, color: colors.primary },
});
