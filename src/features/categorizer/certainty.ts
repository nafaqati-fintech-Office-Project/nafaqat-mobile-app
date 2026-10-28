import { UNCATEGORIZED } from './categorize';

// The server's own CONFIDENCE_THRESHOLD: below it the server does not trust its ML model.
export const LOW_CONFIDENCE = 0.7;

// How much the app trusts a stored category; #7 shows it and #8 decides whom to ask.
// "uncategorized": nothing could name a category, so the user picks one.
// "unsure": an ML answer below LOW_CONFIDENCE, so the user is asked to confirm.
export type Certainty = 'confident' | 'unsure' | 'uncategorized';

export function certaintyOf({
  category,
  source,
  confidence,
}: {
  category: string;
  source: string;
  confidence?: number | null;
}): Certainty {
  if (category === UNCATEGORIZED) return 'uncategorized';
  // Only the ML model's own probability is judged. Gemini, the merchant lists and the rules are
  // trusted as they are; older rows stored the raw ML probability next to those answers.
  if (source === 'model' && typeof confidence === 'number' && confidence < LOW_CONFIDENCE) return 'unsure';
  return 'confident';
}
