import { lookupCategory } from './lookup';
import { predictOnDevice } from './localModelStore';
import { extractMerchant, predictCategory, type ModelContext, type ModelFailure } from './modelClient';
import { redactForModel } from './redact';
import { smsKind, type SmsKind } from './smsKind';
import { LLM_ONLY, MERCHANT_FALLBACK_ENABLED } from '@/config/env';
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
const CASH_WITHDRAWALS = 'Cash Withdrawals';
const GOVERNMENT_FINES = 'Government & Fines';
const BANK_FEES = 'Bank Fees';
const UTILITIES = 'Utilities';
const INTERNAL_TRANSFERS = 'Internal Transfers';
const REFUNDS = 'Refunds';
const TRANSFER_RE = /\b(?:raast|ibft|iban)\b/i;
const RETAIL_RE = /\bretail\s+(?:transaction|payment)\b/i;

// The user's own category for this merchant, if they set one. It wins over every rule and the model.
export async function userCategory(merchant: string, type: ParsedTxn['type']): Promise<Categorized | null> {
  const category = await findUserCategory(merchant, type);
  if (!category) return null;
  devLog(`[categorize] user rule: ${merchant} -> ${category}`);
  return { category, source: 'rule' };
}

// The answers that need neither the lookup list nor the model: the user's own rule, then what the SMS wording
// says (own-account move, refund, income, ATM, fine, fee, transfer). null = go on to the merchant.
async function ruleCategory(txn: ParsedTxn, merchant: string | undefined, kind: SmsKind | undefined): Promise<Categorized | null> {
  if (merchant) {
    const own = await userCategory(merchant, txn.type);
    if (own) return own;
  }

  // Money moved between the person's own accounts or paid to their own card is neither spending nor income.
  if (kind === 'internal') return { category: INTERNAL_TRANSFERS, source: 'lookup' };

  if (txn.type === 'CREDIT') {
    // Money handed back for a reversed or refunded payment is not income.
    if (kind === 'refund') return { category: REFUNDS, source: 'lookup' };
    devLog('[categorize] credit -> Income (no model call)');
    return { category: INCOME, source: 'fallback' };
  }

  // Some payments say what they are without naming a shop: cash from an ATM, a fine, a fee the bank charged.
  if (kind === 'atm') return { category: CASH_WITHDRAWALS, source: 'lookup' };
  if (kind === 'fine') return { category: GOVERNMENT_FINES, source: 'lookup' };
  if (kind === 'fee' && !merchant) return { category: BANK_FEES, source: 'lookup' };
  // A SADAD bill payment names only a biller number ("Biller 044"), never a shop.
  if (kind === 'bill' && !merchant) return { category: UTILITIES, source: 'lookup' };

  // NayaPay retail receipts also say "Channel Raast", but they are shop payments, not transfers.
  if (!LLM_ONLY && (kind === 'transfer' || TRANSFER_RE.test(txn.raw)) && !RETAIL_RE.test(txn.raw)) {
    devLog('[categorize] person-to-person transfer -> Transfers (no model call)');
    return { category: TRANSFERS, source: 'lookup' };
  }
  return null;
}

// Everything that can be answered on the phone, with no model call: the rules above, then the lookup list.
// null means only the model could tell. Used to re-check transactions that are already saved.
export async function categorizeLocally(txn: ParsedTxn): Promise<Categorized | null> {
  const merchant = txn.merchant?.trim();
  const ruled = await ruleCategory(txn, merchant, smsKind(txn.raw));
  if (ruled) return ruled;
  const hit = merchant && !LLM_ONLY ? lookupCategory(merchant) : null;
  return hit ? { category: hit, source: 'lookup' } : null;
}

export async function categorize(txn: ParsedTxn): Promise<Categorized> {
  const merchant = txn.merchant?.trim();
  const kind = smsKind(txn.raw);
  const ruled = await ruleCategory(txn, merchant, kind);
  if (ruled) return ruled;

  if (merchant) return categorizeMerchant(merchant, { kind, currency: txn.currency, bank: txn.bank });
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

// context: what the SMS says about the payment (kind, currency, bank); it helps the model and is optional.
export async function categorizeMerchant(merchant: string, context?: ModelContext): Promise<Categorized> {
  const hit = LLM_ONLY ? null : lookupCategory(merchant);
  if (hit) {
    devLog(`[categorize] lookup hit: ${merchant} -> ${hit}`);
    return { category: hit, source: 'lookup' };
  }

  // The model runs on the phone. A confident answer needs no server call at all; an unsure one goes to the
  // server, which checks its verified list and then asks the LLM. (The LLM-only experiment skips this step.)
  if (!LLM_ONLY) {
    const local = await predictOnDevice(merchant);
    if (local) {
      devLog(`[categorize] on-device model: ${merchant} -> ${local.category} (${local.confidence.toFixed(2)})`);
      return { category: local.category, source: 'model', confidence: local.confidence };
    }
  }

  // In the experiment names also reach the LLM, so digits and account-like parts are removed first.
  const prediction = await predictCategory(LLM_ONLY ? redactForModel(merchant) : merchant, context);
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
