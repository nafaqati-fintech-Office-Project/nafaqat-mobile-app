import { lookupCategory } from './lookup';
import { extractMerchant, predictCategory } from './modelClient';
import { redactForModel } from './redact';
import { MERCHANT_FALLBACK_ENABLED } from '@/config/env';
import { devLog } from '@/utils/devLog';
import type { ParsedTxn } from '@/features/sms/parser/types';

export type Categorized = {
  category: string;
  source: 'lookup' | 'model' | 'llm' | 'fallback';
  confidence?: number;
  // Set only when the server named a merchant the parser could not find.
  merchant?: string;
};

const UNCATEGORIZED = 'Uncategorized';
const INCOME = 'Income';
const TRANSFERS = 'Transfers';
const TRANSFER_RE = /\b(?:raast|ibft|iban)\b/i;
const RETAIL_RE = /\bretail\s+(?:transaction|payment)\b/i;

export async function categorize(txn: ParsedTxn): Promise<Categorized> {
  if (txn.type === 'CREDIT') {
    devLog('[categorize] credit -> Income (no model call)');
    return { category: INCOME, source: 'fallback' };
  }

  // NayaPay retail receipts also say "Channel Raast", but they are shop payments, not transfers.
  if (TRANSFER_RE.test(txn.raw) && !RETAIL_RE.test(txn.raw)) {
    devLog('[categorize] person-to-person transfer -> Transfers (no model call)');
    return { category: TRANSFERS, source: 'lookup' };
  }

  let merchant = txn.merchant?.trim();
  let extracted = false;
  if (!merchant && MERCHANT_FALLBACK_ENABLED) {
    // Only the redacted text leaves the device (no digits, amounts, IBANs, URLs or emails).
    merchant = (await extractMerchant(redactForModel(txn.raw))) ?? undefined;
    extracted = merchant !== undefined;
    devLog(`[categorize] server merchant fallback -> ${merchant ?? 'none'}`);
  }
  if (!merchant) {
    devLog('[categorize] no merchant parsed -> Uncategorized (no model call)');
    devLog(`[categorize] masked sms (${txn.bank}): ${txn.raw.replace(/\d/g, '#')}`);
    return { category: UNCATEGORIZED, source: 'fallback' };
  }
  const withMerchant = (result: Categorized): Categorized =>
    extracted ? { ...result, merchant } : result;

  const hit = lookupCategory(merchant);
  if (hit) {
    devLog(`[categorize] lookup hit: ${merchant} -> ${hit}`);
    return withMerchant({ category: hit, source: 'lookup' });
  }

  const prediction = await predictCategory(merchant);
  if (!prediction) {
    devLog(`[categorize] no model answer for ${merchant} -> Uncategorized`);
    return withMerchant({ category: UNCATEGORIZED, source: 'fallback' });
  }

  const { category, confidence, predictionSource } = prediction;
  // The server answers "Unknown" when the model was unsure and nothing else could help.
  if (predictionSource === 'unknown') {
    devLog(`[categorize] server could not classify ${merchant} -> Uncategorized`);
    return withMerchant({ category: UNCATEGORIZED, source: 'fallback' });
  }
  // A person's name is not a shop: the server labels it "Person" (a Gemini decision).
  if (predictionSource === 'llm' || predictionSource === 'person') return withMerchant({ category, source: 'llm', confidence });
  if (predictionSource === 'historical_lookup') return withMerchant({ category, source: 'lookup', confidence });
  return withMerchant({ category, source: 'model', confidence });
}
