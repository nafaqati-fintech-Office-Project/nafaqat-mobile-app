import { API_URL } from '@/config/env';

const TIMEOUT_MS = 5000;

export type ModelPrediction = { category: string; confidence: number };

export async function predictCategory(text: string): Promise<ModelPrediction | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return null;
    const { category, confidence } = body as { category?: unknown; confidence?: unknown };
    if (typeof category !== 'string' || typeof confidence !== 'number') return null;
    return { category, confidence };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
