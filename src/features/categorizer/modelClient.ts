import { API_URL } from '@/config/env';
import { devLog } from '@/utils/devLog';

// The server may call Gemini inside the request, so the timeout allows for it.
const TIMEOUT_MS = 15000;

export type ModelPrediction = {
  category: string;
  confidence: number;
  predictionSource: string | null;
};

// Asks the server to name the merchant in an already-redacted SMS body. Never throws.
export async function extractMerchant(redactedText: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    devLog(`[model] POST ${API_URL}/extract-merchant`);
    const response = await fetch(`${API_URL}/extract-merchant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: redactedText }),
      signal: controller.signal,
    });
    if (!response.ok) {
      devLog(`[model] extract HTTP ${response.status}`);
      return null;
    }
    const body: unknown = await response.json();
    const merchant = (body as { merchant?: unknown } | null)?.merchant;
    return typeof merchant === 'string' && merchant.trim() ? merchant.trim() : null;
  } catch (error) {
    devLog(`[model] extract failed: ${String(error)}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function predictCategory(text: string): Promise<ModelPrediction | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    devLog(`[model] POST ${API_URL}/predict`);
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!response.ok) {
      devLog(`[model] HTTP ${response.status}`);
      return null;
    }
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return null;
    const { category, confidence, prediction_source } = body as {
      category?: unknown;
      confidence?: unknown;
      prediction_source?: unknown;
    };
    if (typeof category !== 'string' || typeof confidence !== 'number') {
      devLog('[model] unexpected response shape');
      return null;
    }
    devLog(`[model] ${category} ${confidence} source=${String(prediction_source)}`);
    return {
      category,
      confidence,
      predictionSource: typeof prediction_source === 'string' ? prediction_source : null,
    };
  } catch (error) {
    devLog(`[model] request failed: ${String(error)}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
