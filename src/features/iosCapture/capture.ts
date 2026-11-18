import { acknowledgeCaptured, drainCaptured, type CapturedItem } from '../../../modules/nafaqati-capture';
import { captureConfig } from './config';
import { hasTestMarker, isRelevant, isSecretCode, keepLastFourOnly } from './filters';
import { markSeen, readHeld, wasSeenRecently, writeHeld, type HeldPayment } from './heldStore';
import { hasSavedDebitNear, type DebitProbe } from './matchRepo';
import { isIncomplete, parseWalletPayment, sameDebit } from './wallet';
import { categorize } from '@/features/categorizer/categorize';
import { parseSms } from '@/features/sms/parser/parseSms';
import type { ParsedTxn } from '@/features/sms/parser/types';
import type { ProcessedSms } from '@/features/sms/processSms';
import type { SmsMessage } from '@/features/sms/smsReader';
import { handleIncomingSms, saveProcessed } from '@/features/sms/smsSync';
import type { CaptureConfig } from '@/features/iosSetup/types';

// The capture pipeline: what the Shortcuts actions left in the queue becomes transactions.
//
//   queue item -> secret code? drop -> not a money message? drop -> same text twice? drop
//              -> (bank message) the existing parser and categorizer, "Needs review" when unreadable
//              -> (Wallet payment) held for its SMS; saved alone if none arrives; asked to complete if half empty
//
// An item leaves the queue only after it was handled, so a crash or a missing network loses nothing, and once it is
// handled the raw text is gone from the device (retention) apart from the Needs review list the user sees.

export type Deps = {
  drain: () => Promise<CapturedItem[]>;
  acknowledge: (ids: string[]) => Promise<void>;
  handleSms: (sms: SmsMessage) => Promise<unknown>;
  saveWallet: (held: HeldPayment) => Promise<void>;
  savedDebitNear: (probe: DebitProbe, windowMs: number, wallet: boolean) => Promise<boolean>;
  readHeld: () => Promise<HeldPayment[]>;
  writeHeld: (list: HeldPayment[]) => Promise<void>;
  wasSeen: (text: string, now: number, windowMs: number) => Promise<boolean>;
  markSeen: (text: string, now: number, windowMs: number) => Promise<void>;
  now: () => number;
  config: () => CaptureConfig;
};

/** A Wallet payment becomes a transaction without a bank message: the card issuer is Apple Pay. */
async function saveWalletPayment(held: HeldPayment): Promise<void> {
  const txn: ParsedTxn = {
    smsId: held.id,
    bank: 'Apple Pay',
    type: 'DEBIT',
    amount: held.amount.toFixed(2),
    currency: held.currency,
    merchant: held.merchant,
    cardLast4: held.cardLast4,
    balance: null,
    txnDate: null,
    date: held.receivedAt,
    raw: '',
  };
  const { category, source, confidence, predictionId, merchant, retry, retryText } = await categorize(txn);
  const result: ProcessedSms = {
    txn: merchant ? { ...txn, merchant } : txn,
    category,
    source,
    confidence,
    predictionId,
    retry,
    retryText,
  };
  await saveProcessed(result);
}

const realDeps: Deps = {
  drain: drainCaptured,
  acknowledge: acknowledgeCaptured,
  handleSms: handleIncomingSms,
  saveWallet: saveWalletPayment,
  savedDebitNear: hasSavedDebitNear,
  readHeld,
  writeHeld,
  wasSeen: wasSeenRecently,
  markSeen,
  now: Date.now,
  config: captureConfig,
};

export type CaptureResult = { handled: number; dropped: number; held: number; failed: number };

async function handleBank(item: CapturedItem, held: HeldPayment[], deps: Deps, cfg: CaptureConfig): Promise<'saved' | 'dropped'> {
  const text = item.text ?? '';
  // Order matters: secrets first, so a one-time password is never looked at again by anything else.
  if (!text.trim() || hasTestMarker(text) || isSecretCode(text) || !isRelevant(text)) return 'dropped';
  if (await deps.wasSeen(text, item.receivedAt, cfg.matchWindowMs)) return 'dropped';

  const sms: SmsMessage = {
    id: `ios:${item.id}`,
    address: item.sender?.trim() || 'iPhone',
    body: keepLastFourOnly(text),
    date: item.receivedAt,
  };

  // The same purchase may also have come from Wallet. The bank message has more detail, so it wins.
  const txn = parseSms(sms);
  if (txn?.type === 'DEBIT') {
    const probe = { amount: Number.parseFloat(txn.amount), currency: txn.currency, cardLast4: txn.cardLast4, at: item.receivedAt };
    const match = held.findIndex((h) => sameDebit(probe, { ...h, at: h.receivedAt }, cfg.matchWindowMs));
    if (match >= 0) held.splice(match, 1);
    else if (await deps.savedDebitNear(probe, cfg.matchWindowMs, true)) return 'dropped'; // Wallet side already saved it
  }

  await deps.handleSms(sms);
  await deps.markSeen(text, item.receivedAt, cfg.matchWindowMs);
  return 'saved';
}

async function handleWallet(item: CapturedItem, held: HeldPayment[], deps: Deps, cfg: CaptureConfig): Promise<'held' | 'dropped'> {
  const payment = parseWalletPayment(item);
  const probe = { amount: payment.amount, currency: payment.currency, cardLast4: payment.cardLast4, at: item.receivedAt };
  const known = payment.amount > 0 || payment.cardLast4 !== null;
  // The bank message got here first and is already a transaction.
  if (known && (await deps.savedDebitNear(probe, cfg.matchWindowMs, false))) return 'dropped';
  held.push({ id: `wallet:${item.id}`, receivedAt: item.receivedAt, ...payment });
  return 'held';
}

/** Wallet items whose wait is over: complete ones are saved on their own, incomplete ones ask the user. */
async function settle(held: HeldPayment[], deps: Deps, cfg: CaptureConfig): Promise<HeldPayment[]> {
  const now = deps.now();
  const keep: HeldPayment[] = [];
  for (const h of held) {
    if (h.needsCompletion) {
      keep.push(h);
    } else if (isIncomplete(h)) {
      keep.push(now - h.receivedAt >= cfg.incompleteWaitMs ? { ...h, needsCompletion: true } : h);
    } else if (now - h.receivedAt >= cfg.walletHoldMs) {
      try {
        await deps.saveWallet(h);
      } catch {
        keep.push(h); // tried again on the next run
      }
    } else {
      keep.push(h);
    }
  }
  return keep;
}

let running: Promise<CaptureResult> | null = null;

export function processCaptured(deps: Deps = realDeps): Promise<CaptureResult> {
  // One run at a time: the app can ask on start, on coming to the front and on a timer.
  running ??= run(deps).finally(() => {
    running = null;
  });
  return running;
}

async function run(deps: Deps): Promise<CaptureResult> {
  const cfg = deps.config();
  const result: CaptureResult = { handled: 0, dropped: 0, held: 0, failed: 0 };
  const items = (await deps.drain()).sort((a, b) => a.receivedAt - b.receivedAt);
  const held = await deps.readHeld();
  const done: string[] = [];

  for (const item of items) {
    try {
      const outcome = item.kind === 'wallet' ? await handleWallet(item, held, deps, cfg) : await handleBank(item, held, deps, cfg);
      if (outcome === 'saved') result.handled++;
      else if (outcome === 'held') result.held++;
      else result.dropped++;
      done.push(item.id);
    } catch {
      result.failed++; // stays in the queue for the next run
    }
  }

  // Held items are written before the queue is cleared, so a crash in between cannot lose a payment.
  const remaining = await settle(held, deps, cfg);
  await deps.writeHeld(remaining);
  await deps.acknowledge(done);
  return result;
}
