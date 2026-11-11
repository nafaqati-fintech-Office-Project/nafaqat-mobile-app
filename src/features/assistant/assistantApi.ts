import { create } from 'axios';

import type { ActionId } from './types';
import { api } from '@/api/client';
import { API_URL } from '@/config/env';
import { AUTH_BYPASS } from '@/config/flags';
import type { Language } from '@/i18n';

// The gateway gives the model service 30 seconds; the server stops trying keys a little before that.
const TIMEOUT_MS = 32_000;
const ACTIONS = new Set<ActionId>([
  'edit_budget',
  'view_budget',
  'view_goals',
  'add_to_goal',
  'view_subscriptions',
  'view_reports',
  'view_transactions',
]);

// Signed in, through the gateway (it checks the JWT and adds the user id); auth bypass has no token,
// so that dev mode calls the model server directly, like the categorizer does.
const http = AUTH_BYPASS ? create({ baseURL: API_URL }) : api;
const PATH = AUTH_BYPASS ? '/assistant/chat' : '/api/ai-service/assistant/chat';

export type ChatTurn = { role: 'user' | 'assistant'; text: string };

export type ChatBody = {
  question: string;
  language: Language;
  history: ChatTurn[];
  context: object;
  facts: string[];
};

export type ModelReply = { reply: string; actions: ActionId[] };

// The model's reply, or null whenever there is none (offline, limit reached, server not updated yet):
// the caller then shows the facts engine's own answer.
export async function askAssistant(body: ChatBody): Promise<ModelReply | null> {
  try {
    const { data } = await http.post<unknown>(PATH, body, { timeout: TIMEOUT_MS });
    const raw = (data ?? {}) as { reply?: unknown; actions?: unknown };
    if (typeof raw.reply !== 'string' || !raw.reply.trim()) return null;
    const actions = Array.isArray(raw.actions)
      ? raw.actions.filter((a): a is ActionId => typeof a === 'string' && ACTIONS.has(a as ActionId))
      : [];
    return { reply: raw.reply.trim(), actions };
  } catch {
    return null;
  }
}
