import { create, isAxiosError } from 'axios';

import { api } from '@/api/client';
import { API_URL } from '@/config/env';
import { AUTH_BYPASS } from '@/config/flags';
import { devLog } from '@/utils/devLog';

// The server may try up to three Gemini keys at 10s each; the gateway gives it 30s.
const TIMEOUT_MS = 30000;
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
  // The server's id for this answer in its prediction log; sent back with a correction.
  predictionId: string | null;
};

// Why a call gave no answer. "unavailable": no reply, an expired session, rate limiting, or the
// gateway reporting the model down; worth retrying later. "rejected": the server answered but
// refused or mangled this input, so retrying it is unlikely to help.
export type ModelFailure = 'unavailable' | 'rejected';

const RETRYABLE_STATUS = new Set([401, 408, 429, 502, 503, 504]);

let inFlight = 0;
const queue: (() => void)[] = [];
let unavailableUntil = 0;
// True after a call found the model unreachable, until a call gets an answer again.
let wasUnavailable = false;
const availableListeners = new Set<() => void>();
// Keyed by path and text; holds the pending call too, so a repeat waits for it instead of asking again.
const answers = new Map<string, { at: number; result: Promise<unknown> }>();

// Forgets cached answers and any cooldown, e.g. after the user corrects a category.
export function resetModelClient(): void {
  answers.clear();
  unavailableUntil = 0;
  wasUnavailable = false;
}

// Fires when the model answers again after being unreachable, so the transactions saved in the
// meantime can be retried without waiting for the app to be reopened.
export function onModelAvailable(listener: () => void): () => void {
  availableListeners.add(listener);
  return () => {
    availableListeners.delete(listener);
  };
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
  extra: object = {},
): Promise<T | ModelFailure> {
  // The same name can be another category for another kind of payment, so the extra facts are part of the key.
  const key = `${path}
${text}
${JSON.stringify(extra)}`;
  const cached = answers.get(key);
  if (cached && Date.now() - cached.at < ANSWER_TTL_MS) return cached.result as Promise<T | ModelFailure>;

  const result = send(path, text, parse, extra);
  if (answers.size >= MAX_ANSWERS) answers.delete(answers.keys().next().value!);
  answers.set(key, { at: Date.now(), result });
  void result.then((value) => {
    if (typeof value === 'string') answers.delete(key);
  });
  return result;
}

async function send<T>(
  path: string,
  text: string,
  parse: (data: unknown) => T | ModelFailure,
  extra: object,
): Promise<T | ModelFailure> {
  if (Date.now() < unavailableUntil) return 'unavailable';
  await acquire();
  try {
    // The model may have gone down while this call waited for a slot.
    if (Date.now() < unavailableUntil) return 'unavailable';
    const result = parse(await post(path, { text, ...extra }));
    if (wasUnavailable) {
      wasUnavailable = false;
      devLog('[model] reachable again');
      availableListeners.forEach((listener) => listener());
    }
    return result;
  } catch (error) {
    const kind = failure(error, path);
    if (kind === 'unavailable') {
      // A 503 is one request the model could not answer (its LLM failed just then): that row is retried
      // later, but the others still get their turn. Only a real outage pauses every call.
      if (!isAxiosError(error) || error.response?.status !== 503) unavailableUntil = Date.now() + COOLDOWN_MS;
      wasUnavailable = true;
    }
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

// A plain GET of a model server path (the on-device model file and its version). Not limited or
// cached like the prediction calls; the caller handles errors. The file is about 0.8 MB compressed.
export async function getModelJson(path: string): Promise<unknown> {
  devLog(`[model] GET ${PREFIX}${path}`);
  const response = await http.get<unknown>(`${PREFIX}${path}`, { timeout: 60_000 });
  return response.data;
}

// Asks the server to name the merchant in an already-redacted SMS body; merchant is null when it
// found none. Never throws.
export function extractMerchant(redactedText: string): Promise<{ merchant: string | null } | ModelFailure> {
  return request('/extract-merchant', redactedText, (body) => {
    const merchant = (body as { merchant?: unknown } | null)?.merchant;
    return { merchant: typeof merchant === 'string' && merchant.trim() ? merchant.trim() : null };
  });
}

// What the SMS says about the payment, as short labels. Sent only when there is something to say.
export type ModelContext = { kind?: string; currency?: string; bank?: string };

export function predictCategory(text: string, context?: ModelContext): Promise<ModelPrediction | ModelFailure> {
  const extra = Object.fromEntries(Object.entries(context ?? {}).filter(([, value]) => value));
  return request('/predict', text, (body) => {
    if (typeof body !== 'object' || body === null) {
      devLog('[model] unexpected response shape');
      return 'rejected';
    }
    const { category, confidence, prediction_source, prediction_id } = body as {
      category?: unknown;
      confidence?: unknown;
      prediction_source?: unknown;
      prediction_id?: unknown;
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
      predictionId: typeof prediction_id === 'string' && prediction_id ? prediction_id : null,
    };
  }, extra);
}
