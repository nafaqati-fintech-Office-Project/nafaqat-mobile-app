import { lookupCategory } from './lookup';
import { extractMerchant, predictCategory, type ModelFailure } from './modelClient';
import { redactForModel } from './redact';
import { MERCHANT_FALLBACK_ENABLED } from '@/config/env';
import { findUserCategory } from '@/features/transactions/categoryRules';
import { devLog } from '@/utils/devLog';
import type { ParsedTxn } from '@/features/sms/parser/types';

export type Categorized = {
  category: string;
  // "rule": the signed-in user's own rule for this merchant. "user" (picked by hand on one
  // transaction) is set only by changeCategory, never here.
  source: 'lookup' | 'model' | 'llm' | 'fallback' | 'rule' | 'user';
  confidence?: number;
  // The server's prediction log id, when the category came from /predict.
  predictionId?: string;
  // Set only when the server named a merchant the parser could not find.
  merchant?: string;
  // Set when a model call failed, so the transaction is saved for a later retry.
  retry?: ModelFailure;
  // The redacted SMS body, kept only while merchant extraction is still to be retried.
  retryText?: string;
};

export const UNCATEGORIZED = 'Uncategorized';
const INCOME = 'Income';
const TRANSFERS = 'Transfers';
const TRANSFER_RE = /\b(?:raast|ibft|iban)\b/i;
const RETAIL_RE = /\bretail\s+(?:transaction|payment)\b/i;

// The user's own category for this merchant, if they set one. It wins over every rule and the model.
export async function userCategory(merchant: string, type: ParsedTxn['type']): Promise<Categorized | null> {
  const category = await findUserCategory(merchant, type);
  if (!category) return null;
  devLog(`[categorize] user rule: ${merchant} -> ${category}`);
  return { category, source: 'rule' };
}

export async function categorize(txn: ParsedTxn): Promise<Categorized> {
  const merchant = txn.merchant?.trim();
  if (merchant) {
    const own = await userCategory(merchant, txn.type);
    if (own) return own;
  }

  if (txn.type === 'CREDIT') {
    devLog('[categorize] credit -> Income (no model call)');
    return { category: INCOME, source: 'fallback' };
  }

  // NayaPay retail receipts also say "Channel Raast", but they are shop payments, not transfers.
  if (TRANSFER_RE.test(txn.raw) && !RETAIL_RE.test(txn.raw)) {
    devLog('[categorize] person-to-person transfer -> Transfers (no model call)');
    return { category: TRANSFERS, source: 'lookup' };
  }

  if (merchant) return categorizeMerchant(merchant);
  if (MERCHANT_FALLBACK_ENABLED) {
    // Only the redacted text leaves the device (no digits, amounts, IBANs, URLs or emails).
    const result = await categorizeRedacted(redactForModel(txn.raw));
    if (result.merchant || result.retry) return result;
  }
  devLog('[categorize] no merchant parsed -> Uncategorized (no model call)');
  devLog(`[categorize] masked sms (${txn.bank}): ${txn.raw.replace(/\d/g, '#')}`);
  return { category: UNCATEGORIZED, source: 'fallback' };
}

// Asks the server to name the merchant in a redacted SMS body, then categorizes that merchant.
export async function categorizeRedacted(redacted: string): Promise<Categorized> {
  const extracted = await extractMerchant(redacted);
  if (typeof extracted === 'string') {
    devLog(`[categorize] server merchant fallback ${extracted} -> Uncategorized for now`);
    return { category: UNCATEGORIZED, source: 'fallback', retry: extracted, retryText: redacted };
  }
  devLog(`[categorize] server merchant fallback -> ${extracted.merchant ?? 'none'}`);
  if (!extracted.merchant) return { category: UNCATEGORIZED, source: 'fallback' };
  // Only debits reach the server, so the user's debit rule is the one that applies.
  const result = (await userCategory(extracted.merchant, 'DEBIT')) ?? (await categorizeMerchant(extracted.merchant));
  return { ...result, merchant: extracted.merchant };
}

export async function categorizeMerchant(merchant: string): Promise<Categorized> {
  const hit = lookupCategory(merchant);
  if (hit) {
    devLog(`[categorize] lookup hit: ${merchant} -> ${hit}`);
    return { category: hit, source: 'lookup' };
  }

  const prediction = await predictCategory(merchant);
  if (typeof prediction === 'string') {
    devLog(`[categorize] no model answer for ${merchant} (${prediction}) -> Uncategorized for now`);
    return { category: UNCATEGORIZED, source: 'fallback', retry: prediction };
  }

  const { category, confidence, predictionSource } = prediction;
  // The server answers "Unknown" when the model was unsure and nothing else could help.
  if (predictionSource === 'unknown') {
    devLog(`[categorize] server could not classify ${merchant} -> Uncategorized`);
    return { category: UNCATEGORIZED, source: 'fallback' };
  }
  const logged = prediction.predictionId ? { predictionId: prediction.predictionId } : {};
  // A person's name is not a shop: the server labels it "Person" (a Gemini decision).
  if (predictionSource === 'llm' || predictionSource === 'person') return { category, source: 'llm', confidence, ...logged };
  if (predictionSource === 'historical_lookup') return { category, source: 'lookup', confidence, ...logged };
  return { category, source: 'model', confidence, ...logged };
}
