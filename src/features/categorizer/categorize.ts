import { lookupCategory } from './lookup';
import { predictCategory } from './modelClient';
import { CONFIDENCE_THRESHOLD } from '@/config/env';
import type { ParsedTxn } from '@/features/sms/parser/types';

export type Categorized = {
  category: string;
  source: 'lookup' | 'model' | 'fallback';
  confidence?: number;
};

const UNCATEGORIZED = 'Uncategorized';
const INCOME = 'Income';

export async function categorize(txn: ParsedTxn): Promise<Categorized> {
  if (txn.type === 'CREDIT') return { category: INCOME, source: 'fallback' };

  const merchant = txn.merchant?.trim();
  if (!merchant) return { category: UNCATEGORIZED, source: 'fallback' };

  const hit = lookupCategory(merchant);
  if (hit) return { category: hit, source: 'lookup' };

  const prediction = await predictCategory(merchant);
  if (prediction && prediction.confidence >= CONFIDENCE_THRESHOLD) {
    return { category: prediction.category, source: 'model', confidence: prediction.confidence };
  }
  return { category: UNCATEGORIZED, source: 'fallback', confidence: prediction?.confidence };
}
