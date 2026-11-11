import { useCallback, useEffect, useRef, useState } from 'react';

import { askAssistant } from './assistantApi';
import { loadAssistantData } from './assistantContext';
import { toContext } from './assistantSummary';
import { answerQuestion } from './assistantFacts';
import { clearHistory, getConsent, loadHistory, saveHistory, setConsent } from './assistantStore';
import type { ActionId, AssistantAction, AssistantData, ChatMessage } from './types';
import { useAuth } from '@/auth/AuthProvider';
import { useLanguage } from '@/i18n/LanguageProvider';

// Data older than this is loaded again before answering, so a new payment shows up in the answers.
const FRESH_MS = 5 * 60_000;
const HISTORY_SENT = 6;
const MAX_ACTIONS = 3;

let nextId = 0;
const newId = () => `${Date.now()}-${(nextId += 1)}`;

// The engine's buttons first (they carry the goal), then any other screen the model suggested.
function mergeActions(own: AssistantAction[], suggested: ActionId[]): AssistantAction[] {
  const goal = own.find((a) => a.id === 'add_to_goal');
  const extra = suggested.map((id): AssistantAction => (id === 'add_to_goal' ? (goal ?? { id: 'view_goals' }) : { id }));
  const seen = new Set<ActionId>();
  return [...own, ...extra].filter((a) => !seen.has(a.id) && seen.add(a.id)).slice(0, MAX_ACTIONS);
}

export function useAssistant() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const userId = user?.id ?? 'anonymous';
  const firstName = user?.firstName ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [consent, setConsentState] = useState<boolean | null>(null);
  const [typing, setTyping] = useState(false);
  const data = useRef<{ value: AssistantData; at: number } | null>(null);
  const pending = useRef<Promise<AssistantData> | null>(null);
  const current = useRef<ChatMessage[]>([]);

  const ensureData = useCallback(async (): Promise<AssistantData> => {
    if (data.current && Date.now() - data.current.at < FRESH_MS) return data.current.value;
    pending.current ??= loadAssistantData(firstName)
      .then((value) => {
        data.current = { value, at: Date.now() };
        return value;
      })
      .finally(() => {
        pending.current = null;
      });
    return pending.current;
  }, [firstName]);

  useEffect(() => {
    let active = true;
    void Promise.all([loadHistory(userId), getConsent(userId)]).then(([history, agreed]) => {
      if (!active) return;
      current.current = history;
      setMessages(history);
      setConsentState(agreed);
      // Warm up, so the first question is answered quickly.
      if (agreed) ensureData().catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [userId, ensureData]);

  const append = useCallback(
    (message: ChatMessage) => {
      current.current = [...current.current, message];
      setMessages(current.current);
      void saveHistory(userId, current.current);
    },
    [userId],
  );

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || typing) return;
      const history = current.current.slice(-HISTORY_SENT).map((m) => ({ role: m.role, text: m.text.slice(0, 1000) }));
      append({ id: newId(), role: 'user', text: question, at: Date.now() });
      setTyping(true);
      try {
        let value: AssistantData;
        try {
          value = await ensureData();
        } catch {
          append({ id: newId(), role: 'assistant', text: t('assistant.loadError'), source: 'offline', at: Date.now() });
          return;
        }
        const answer = answerQuestion(question, value, language);
        const reply = await askAssistant({
          question,
          language,
          history,
          context: toContext(value, language),
          facts: answer.facts,
        });
        append({
          id: newId(),
          role: 'assistant',
          text: reply?.reply ?? answer.fallback,
          actions: mergeActions(answer.actions, reply?.actions ?? []),
          source: reply ? 'model' : 'offline',
          at: Date.now(),
        });
      } finally {
        setTyping(false);
      }
    },
    [append, ensureData, language, t, typing],
  );

  const clear = useCallback(async () => {
    current.current = [];
    setMessages([]);
    await clearHistory(userId);
  }, [userId]);

  const accept = useCallback(async () => {
    setConsentState(true);
    await setConsent(userId);
    ensureData().catch(() => undefined);
  }, [userId, ensureData]);

  return { messages, consent, typing, send, clear, accept, firstName };
}
