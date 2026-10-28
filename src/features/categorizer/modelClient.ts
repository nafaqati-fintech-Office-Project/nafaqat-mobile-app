import { create, isAxiosError } from 'axios';

import { api } from '@/api/client';
import { API_URL } from '@/config/env';
import { AUTH_BYPASS } from '@/config/flags';
import { devLog } from '@/utils/devLog';

// The server may call Gemini inside the request, so the timeout allows for it.
const TIMEOUT_MS = 15000;
// Model calls at once across the whole app (history import, SMS listener, retry).
const MAX_IN_FLIGHT = 3;
// Once the model was unreachable, calls fail at once for this long instead of each waiting out
// the timeout; the rows they flag are picked up by retryPendingPredictions later.
const COOLDOWN_MS = 30_000;
// An import sees the same merchant many times; its answer is reused for this long.
const ANSWER_TTL_MS = 10 * 60_000;
const MAX_ANSWERS = 500;

// Signed in, the app calls the model through the gateway, which checks the JWT and forwards
// /api/ai-service/** to the model server. Auth bypass has no token, so that dev mode calls the
// model server directly.
const http = AUTH_BYPASS ? create({ baseURL: API_URL }) : api;
const PREFIX = AUTH_BYPASS ? '' : '/api/ai-service';

export type ModelPrediction = {
  category: string;
  confidence: number;
  predictionSource: string | null;
};

// Why a call gave no answer. "unavailable": no reply, an expired session, rate limiting, or the
// gateway reporting the model down; worth retrying later. "rejected": the server answered but
// refused or mangled this input, so retrying it is unlikely to help.
export type ModelFailure = 'unavailable' | 'rejected';

const RETRYABLE_STATUS = new Set([401, 408, 429, 502, 503, 504]);

let inFlight = 0;
const queue: (() => void)[] = [];
let unavailableUntil = 0;
// Keyed by path and text; holds the pending call too, so a repeat waits for it instead of asking again.
const answers = new Map<string, { at: number; result: Promise<unknown> }>();

// Forgets cached answers and any cooldown, e.g. after the user corrects a category.
export function resetModelClient(): void {
  answers.clear();
  unavailableUntil = 0;
}

async function acquire(): Promise<void> {
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight += 1;
    return;
  }
  // release() hands its slot straight to the next waiter, so inFlight stays the same.
  await new Promise<void>((resolve) => queue.push(resolve));
}

function release(): void {
  const next = queue.shift();
  if (next) next();
  else inFlight -= 1;
}

async function post(path: string, body: object): Promise<unknown> {
  devLog(`[model] POST ${PREFIX}${path}`);
  const response = await http.post<unknown>(`${PREFIX}${path}`, body, { timeout: TIMEOUT_MS });
  return response.data;
}

// One model call with the shared limits: cached answers, the cooldown and MAX_IN_FLIGHT.
// Failures are not cached, so a later call asks again.
function request<T extends object>(
  path: string,
  text: string,
  parse: (data: unknown) => T | ModelFailure,
): Promise<T | ModelFailure> {
  const key = `${path}
${text}`;
  const cached = answers.get(key);
  if (cached && Date.now() - cached.at < ANSWER_TTL_MS) return cached.result as Promise<T | ModelFailure>;

  const result = send(path, text, parse);
  if (answers.size >= MAX_ANSWERS) answers.delete(answers.keys().next().value!);
  answers.set(key, { at: Date.now(), result });
  void result.then((value) => {
    if (typeof value === 'string') answers.delete(key);
  });
  return result;
}

async function send<T>(path: string, text: string, parse: (data: unknown) => T | ModelFailure): Promise<T | ModelFailure> {
  if (Date.now() < unavailableUntil) return 'unavailable';
  await acquire();
  try {
    // The model may have gone down while this call waited for a slot.
    if (Date.now() < unavailableUntil) return 'unavailable';
    return parse(await post(path, { text }));
  } catch (error) {
    const kind = failure(error, path);
    if (kind === 'unavailable') unavailableUntil = Date.now() + COOLDOWN_MS;
    return kind;
  } finally {
    release();
  }
}

function failure(error: unknown, label: string): ModelFailure {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  const reason = status ? `HTTP ${status}` : isAxiosError(error) ? (error.code ?? error.message) : String(error);
  devLog(`[model] ${label} failed: ${reason}`);
  return status === undefined || RETRYABLE_STATUS.has(status) ? 'unavailable' : 'rejected';
}

// Asks the server to name the merchant in an already-redacted SMS body; merchant is null when it
// found none. Never throws.
export function extractMerchant(redactedText: string): Promise<{ merchant: string | null } | ModelFailure> {
  return request('/extract-merchant', redactedText, (body) => {
    const merchant = (body as { merchant?: unknown } | null)?.merchant;
    return { merchant: typeof merchant === 'string' && merchant.trim() ? merchant.trim() : null };
  });
}

export function predictCategory(text: string): Promise<ModelPrediction | ModelFailure> {
  return request('/predict', text, (body) => {
    if (typeof body !== 'object' || body === null) {
      devLog('[model] unexpected response shape');
      return 'rejected';
    }
    const { category, confidence, prediction_source } = body as {
      category?: unknown;
      confidence?: unknown;
      prediction_source?: unknown;
    };
    if (typeof category !== 'string' || typeof confidence !== 'number') {
      devLog('[model] unexpected response shape');
      return 'rejected';
    }
    devLog(`[model] ${category} ${confidence} source=${String(prediction_source)}`);
    return {
      category,
      confidence,
      predictionSource: typeof prediction_source === 'string' ? prediction_source : null,
    };
  });
}
