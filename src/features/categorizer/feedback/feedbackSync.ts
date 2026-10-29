import { isAxiosError } from 'axios';

import { postFeedback, type FeedbackBody } from './feedbackApi';
import { FEEDBACK_KEPT, FEEDBACK_SENT, listPendingFeedback, markFeedback, type PendingFeedback } from './feedbackRepo';
import { getCurrentUserId } from '@/auth/currentUser';
import { pickableCategories } from '@/features/transactions/categoryDisplay';
import { devLog } from '@/utils/devLog';

const RUN_LIMIT = 100;
// One request at a time with this pause, well under the gateway's per-user rate limit.
const PAUSE_MS = 200;
// Categories found by the model, Gemini or a merchant list. "rule", "user" and "fallback" were not a
// prediction, and a fallback row may be a person the model was never asked about.
const PREDICTED = new Set(['model', 'llm', 'lookup']);
// Never about a shop: a name the app treats as a person stays on the phone.
const PERSONAL = new Set(['Person', 'Transfers']);

let running: Promise<number> | null = null;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const statusOf = (error: unknown) => (isAxiosError(error) ? error.response?.status : undefined);

// The body to send, or null when this change must stay on the device: only a debit whose category came
// from a prediction, moved to one of the model's own categories, and never about a person.
export function toFeedbackBody(row: PendingFeedback): FeedbackBody | null {
  const merchant = row.merchant?.trim();
  if (!merchant || row.type !== 'DEBIT' || !PREDICTED.has(row.fromSource)) return null;
  if (PERSONAL.has(row.fromCategory) || row.fromCategory === row.toCategory) return null;
  if (!pickableCategories('DEBIT').includes(row.toCategory)) return null;
  return {
    merchant,
    from_category: row.fromCategory,
    from_source: row.fromSource,
    to_category: row.toCategory,
    prediction_id: row.predictionId,
  };
}

// Sends the signed-in user's category changes to the model server's feedback log. A call during a run
// joins it. Returns how many were sent. Never throws.
export function syncFeedback(): Promise<number> {
  running ??= run()
    .catch((error: unknown) => {
      devLog(`[feedback] failed: ${String(error)}`);
      return 0;
    })
    .finally(() => {
      running = null;
    });
  return running;
}

async function run(): Promise<number> {
  const userId = getCurrentUserId();
  if (!userId) return 0;
  const rows = await listPendingFeedback(userId, RUN_LIMIT);
  let sent = 0;
  let requests = 0;
  for (const row of rows) {
    const body = toFeedbackBody(row);
    if (!body) {
      await markFeedback(row.id, FEEDBACK_KEPT);
      continue;
    }
    if (requests > 0) await wait(PAUSE_MS);
    requests += 1;
    try {
      await postFeedback(body);
      await markFeedback(row.id, FEEDBACK_SENT);
      sent += 1;
    } catch (error) {
      const status = statusOf(error);
      // No reply, an expired session, rate limiting or a server-side failure: try the rest later.
      if (status === undefined || status === 401 || status === 408 || status === 429 || status >= 500) {
        devLog(`[feedback] server unavailable, stopping after ${sent}`);
        break;
      }
      devLog(`[feedback] row ${row.id} refused: HTTP ${status}`);
      await markFeedback(row.id, FEEDBACK_KEPT);
    }
  }
  if (rows.length > 0) devLog(`[feedback] ${sent} of ${rows.length} sent`);
  return sent;
}
