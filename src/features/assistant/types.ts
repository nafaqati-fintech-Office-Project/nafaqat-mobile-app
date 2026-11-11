import type { Budget } from '@/features/budget/types';
import type { Goal } from '@/features/goals/types';
import type { Report } from '@/features/reports/types';
import type { Subscription } from '@/features/subscriptions/types';

// Everything the assistant knows about the user, loaded on the device. No SMS text, card numbers or
// account identifiers: only totals the app already shows on its screens.
export type AssistantData = {
  firstName: string | null;
  currency: string;
  today: Date;
  // Newest first: this month (still running), then the months before it. Months that failed to load are left out.
  months: Report[];
  budget: Budget | null;
  goals: Goal[]; // active ones
  subscriptions: Subscription[]; // confirmed ones
};

// Screens a reply can offer a button for. The server may suggest these ids too; others are dropped.
export type ActionId =
  | 'edit_budget'
  | 'view_budget'
  | 'view_goals'
  | 'add_to_goal'
  | 'view_subscriptions'
  | 'view_reports'
  | 'view_transactions';

export type AssistantAction = { id: ActionId; goalId?: string; goalName?: string };

export type Intent =
  | 'spendOn'
  | 'topExpenses'
  | 'compare'
  | 'rising'
  | 'budget'
  | 'savings'
  | 'subscriptions'
  | 'cut'
  | 'goal'
  | 'invest'
  | 'overview';

// What the facts engine worked out for one question.
export type Answer = {
  intent: Intent;
  // Exact figures in English, sent to the model to explain.
  facts: string[];
  // The same answer in the user's language, shown when the model cannot be reached.
  fallback: string;
  actions: AssistantAction[];
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: AssistantAction[];
  // "offline": answered by the facts engine alone.
  source?: 'model' | 'offline';
  at: number;
};
