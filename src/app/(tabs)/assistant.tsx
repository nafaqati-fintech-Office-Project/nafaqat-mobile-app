import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { screenTitle } from '@/components/screenTitle';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { ChatBubble } from '@/features/assistant/ChatBubble';
import { TypingIndicator } from '@/features/assistant/TypingIndicator';
import type { AssistantAction } from '@/features/assistant/types';
import { useAssistant } from '@/features/assistant/useAssistant';
import { useVoiceInput, type VoiceProblem } from '@/features/assistant/useVoiceInput';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontFamily, fontSizes, lineHeights, radius, shadows, sizes, spacing } from '@/theme';

const SUGGESTIONS: TranslationKey[] = [
  'assistant.suggest.coffee',
  'assistant.suggest.top',
  'assistant.suggest.cut',
  'assistant.suggest.goal',
  'assistant.suggest.budget',
  'assistant.suggest.invest',
];
const MAX_QUESTION = 500;

const VOICE_PROBLEM: Record<VoiceProblem, TranslationKey> = {
  denied: 'assistant.micDenied',
  unavailable: 'assistant.micUnavailable',
  failed: 'assistant.micError',
};

function openAction(action: AssistantAction) {
  switch (action.id) {
    case 'edit_budget':
      return router.push('/budget-edit');
    case 'view_budget':
      return router.push('/budget');
    case 'view_goals':
      return router.push('/goals');
    case 'add_to_goal':
      return action.goalId ? router.push({ pathname: '/goal-contribute', params: { id: action.goalId } }) : router.push('/goals');
    case 'view_subscriptions':
      return router.push('/subscriptions');
    case 'view_reports':
      return router.push('/reports');
    case 'view_transactions':
      return router.push('/transactions');
  }
}

export default function AssistantRoute() {
  const { t, language } = useLanguage();
  const { messages, consent, typing, send, clear, accept, firstName } = useAssistant();
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);
  // Spoken words fill the box (the user can still edit them); nothing is sent until they press Send.
  const voice = useVoiceInput(language, setDraft, (problem) => showToast(t(VOICE_PROBLEM[problem])));

  // Keep the newest message in view.
  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [messages.length, typing]);

  const submit = (text: string) => {
    if (!text.trim() || typing) return;
    if (voice.listening) voice.stop();
    setDraft('');
    void send(text);
  };

  const confirmClear = () =>
    Alert.alert(t('assistant.clearTitle'), t('assistant.clearBody'), [
      { text: t('assistant.cancel'), style: 'cancel' },
      { text: t('assistant.clear'), style: 'destructive', onPress: () => void clear() },
    ]);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.titles}>
          <AppText weight="bold" style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
            {t('assistant.title')}
          </AppText>
        </View>
        {messages.length > 0 ? (
          <Pressable onPress={confirmClear} accessibilityRole="button" accessibilityLabel={t('assistant.clear')} style={styles.clear}>
            <Icon name="trash" color={colors.textSecondary} size={sizes.iconLg} />
          </Pressable>
        ) : null}
      </View>
      <AppText style={styles.subtitle}>{t('assistant.subtitle')}</AppText>

      {consent === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !consent ? (
        <ScrollView contentContainerStyle={styles.consentWrap}>
          <View style={styles.consentCard}>
            <Icon name="info" color={colors.primary} size={sizes.iconLg} />
            <AppText weight="bold" style={styles.consentTitle}>
              {t('assistant.consentTitle')}
            </AppText>
            <AppText style={styles.consentBody}>{t('assistant.consentBody')}</AppText>
            <PrimaryButton label={t('assistant.consentAccept')} onPress={() => void accept()} />
          </View>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scroll}
            style={styles.fill}
            contentContainerStyle={styles.chat}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.hello}>
              <AppText style={styles.helloText}>
                {firstName ? t('assistant.hello', { name: firstName }) : t('assistant.helloNoName')}
              </AppText>
            </View>
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} onAction={openAction} />
            ))}
            {typing ? <TypingIndicator /> : null}
          </ScrollView>

          {!typing && (messages.length === 0 || messages[messages.length - 1]?.role === 'assistant') ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chips}
              style={styles.chipsBar}>
              {SUGGESTIONS.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => submit(t(key))}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
                  <AppText weight="medium" style={styles.chipText}>
                    {t(key)}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={voice.listening ? t('assistant.listening') : t('assistant.placeholder')}
              placeholderTextColor={colors.textSecondary}
              maxLength={MAX_QUESTION}
              multiline
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => submit(draft)}
              style={styles.input}
              accessibilityLabel={t('assistant.placeholder')}
            />
            {voice.supported ? (
              <Pressable
                onPress={() => (voice.listening ? voice.stop() : void voice.start())}
                disabled={typing}
                accessibilityRole="button"
                accessibilityLabel={voice.listening ? t('assistant.micStop') : t('assistant.mic')}
                accessibilityState={{ selected: voice.listening }}
                style={[styles.mic, voice.listening && styles.micOn]}>
                <Icon name={voice.listening ? 'close' : 'mic'} color={voice.listening ? colors.white : colors.primary} size={sizes.iconLg} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => submit(draft)}
              disabled={!draft.trim() || typing}
              accessibilityRole="button"
              accessibilityLabel={t('assistant.send')}
              style={[styles.send, (!draft.trim() || typing) && styles.sendDisabled]}>
              <Icon name="arrowUp" color={colors.white} size={sizes.iconLg} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: sizes.touchMin,
    backgroundColor: colors.white,
  },
  titles: { flex: 1 },
  title: { ...screenTitle },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clear: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  consentWrap: { padding: spacing.lg },
  consentCard: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  consentTitle: { fontSize: fontSizes.lg, color: colors.textPrimary },
  consentBody: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.textSecondary },
  chat: { padding: spacing.lg },
  hello: {
    alignSelf: 'flex-start',
    maxWidth: '86%',
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.violetSoft,
  },
  helloText: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.textPrimary },
  chipsBar: { flexGrow: 0 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  chip: {
    justifyContent: 'center',
    minHeight: sizes.touchMin - 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipText: { fontSize: fontSizes.xs, color: colors.textPrimary },
  pressed: { opacity: 0.7 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: sizes.touchMin,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bgLight,
    fontFamily: fontFamily('regular'),
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'auto',
  },
  send: {
    width: sizes.touchMin,
    height: sizes.touchMin,
    borderRadius: sizes.touchMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendDisabled: { backgroundColor: colors.primaryDisabled },
  mic: {
    width: sizes.touchMin,
    height: sizes.touchMin,
    borderRadius: sizes.touchMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  micOn: { backgroundColor: colors.danger },
});
