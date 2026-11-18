import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_CAPTURE_CONFIG } from './config';
import type { HeldPayment } from './heldStore';
import { sameDebit, parseWalletPayment, isIncomplete } from './wallet';
import { fingerprint, isRelevant, isSecretCode, keepLastFourOnly } from './filters';
import { processCaptured, type Deps } from './capture';
import type { CapturedItem } from '../../../modules/nafaqati-capture';

// The modules below reach Expo / native code; the pipeline is exercised through injected dependencies instead.
vi.mock('../../../modules/nafaqati-capture', () => ({ drainCaptured: vi.fn(), acknowledgeCaptured: vi.fn() }));
vi.mock('@/features/categorizer/categorize', () => ({ categorize: vi.fn() }));
vi.mock('@/features/sms/smsSync', () => ({ handleIncomingSms: vi.fn(), saveProcessed: vi.fn() }));
vi.mock('./matchRepo', () => ({ hasSavedDebitNear: vi.fn() }));
vi.mock('./heldStore', () => ({
  readHeld: vi.fn(),
  writeHeld: vi.fn(),
  wasSeenRecently: vi.fn(),
  markSeen: vi.fn(),
}));

const NOW = 1_800_000_000_000;
const PURCHASE = 'Purchase SAR 45.00 at Starbucks, mada card *1234';

const bank = (text: string, at = NOW, id = `${at}-${Math.random()}.item`): CapturedItem => ({ id, kind: 'bank', receivedAt: at, text });
const wallet = (fields: Partial<CapturedItem>, at = NOW): CapturedItem => ({
  id: `${at}-w.item`,
  kind: 'wallet',
  receivedAt: at,
  ...fields,
});

function makeDeps(items: CapturedItem[], overrides: Partial<Deps> = {}, now = NOW) {
  let held: HeldPayment[] = [];
  const seen = new Set<string>();
  const handled: string[] = [];
  const savedWallet: HeldPayment[] = [];
  const acked: string[] = [];
  const deps: Deps = {
    drain: async () => items,
    acknowledge: async (ids) => void acked.push(...ids),
    handleSms: async (sms) => void handled.push(sms.body),
    saveWallet: async (h) => void savedWallet.push(h),
    savedDebitNear: async () => false,
    readHeld: async () => held,
    writeHeld: async (list) => void (held = list),
    wasSeen: async (text) => seen.has(fingerprint(text)),
    markSeen: async (text) => void seen.add(fingerprint(text)),
    now: () => now,
    config: () => DEFAULT_CAPTURE_CONFIG,
    ...overrides,
  };
  return { deps, handled, savedWallet, acked, held: () => held };
}

describe('filters', () => {
  it('treats one-time passwords as secrets, even when they mention an amount', () => {
    expect(isSecretCode('Your OTP for purchase SAR 45.00 at Amazon is 123456')).toBe(true);
    expect(isSecretCode('123456 is your verification code')).toBe(true);
    expect(isSecretCode('رمز التحقق 482913 لا تشاركه')).toBe(true);
    expect(isSecretCode(PURCHASE)).toBe(false);
  });

  it('keeps only real money messages', () => {
    expect(isRelevant(PURCHASE)).toBe(true);
    expect(isRelevant('Congratulations! Apply now and get 20% off, offer valid today')).toBe(false);
    expect(isRelevant('Your parcel arrives tomorrow')).toBe(false);
  });

  it('shows only the last four digits of a full card number', () => {
    expect(keepLastFourOnly('Card 4111 1111 1111 1234 used for SAR 5')).toBe('Card ****1234 used for SAR 5');
    expect(keepLastFourOnly('mada card *1234')).toBe('mada card *1234');
  });
});

describe('wallet payments', () => {
  it('reads amount, currency and card from loose text', () => {
    expect(parseWalletPayment({ merchant: ' Starbucks ', amount: 'SAR 45.50', card: 'Mada •••• 1234' })).toEqual({
      merchant: 'Starbucks',
      amount: 45.5,
      currency: 'SAR',
      cardLast4: '1234',
    });
    expect(parseWalletPayment({ amount: '٤٥٫٥٠ ر.س' }).amount).toBe(45.5);
  });

  it('accepts empty values and a zero amount without failing', () => {
    const p = parseWalletPayment({ merchant: '', amount: '0', card: '' });
    expect(p).toMatchObject({ merchant: null, amount: 0, cardLast4: null });
    expect(isIncomplete(p)).toBe(true);
    expect(isIncomplete(parseWalletPayment({}))).toBe(true);
  });

  it('matches the same purchase on amount, card and time', () => {
    const a = { amount: 45, cardLast4: '1234', at: NOW };
    expect(sameDebit(a, { amount: 45, cardLast4: '1234', at: NOW + 60_000 }, 600_000)).toBe(true);
    expect(sameDebit(a, { amount: 45, cardLast4: '9999', at: NOW }, 600_000)).toBe(false);
    expect(sameDebit(a, { amount: 46, cardLast4: '1234', at: NOW }, 600_000)).toBe(false);
    expect(sameDebit(a, { amount: 45, cardLast4: '1234', at: NOW + 3_600_000 }, 600_000)).toBe(false);
    expect(sameDebit({ amount: 0, cardLast4: '1234', at: NOW }, a, 600_000)).toBe(true);
    expect(sameDebit({ amount: 0, cardLast4: null, at: NOW }, a, 600_000)).toBe(false);
  });
});

describe('processCaptured', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hands a bank message to the parser and removes it from the queue', async () => {
    const item = bank(PURCHASE);
    const t = makeDeps([item]);
    expect(await processCaptured(t.deps)).toMatchObject({ handled: 1, dropped: 0, failed: 0 });
    expect(t.handled).toEqual([PURCHASE]);
    expect(t.acked).toEqual([item.id]);
  });

  it('drops a one-time password without handing it on, and still clears it from the queue', async () => {
    const item = bank('Your OTP for purchase SAR 45.00 at Amazon is 123456');
    const t = makeDeps([item]);
    expect(await processCaptured(t.deps)).toMatchObject({ handled: 0, dropped: 1 });
    expect(t.handled).toEqual([]);
    expect(t.acked).toEqual([item.id]);
  });

  it('drops promotions and test messages', async () => {
    const t = makeDeps([bank('Congratulations! Apply now, offer valid today'), bank('Test message NFQ-TEST SAR 1 purchase')]);
    expect(await processCaptured(t.deps)).toMatchObject({ handled: 0, dropped: 2 });
    expect(t.handled).toEqual([]);
  });

  it('keeps one copy when the same message arrives twice', async () => {
    const t = makeDeps([bank(PURCHASE, NOW), bank(PURCHASE, NOW + 2_000)]);
    expect(await processCaptured(t.deps)).toMatchObject({ handled: 1, dropped: 1 });
    expect(t.handled).toHaveLength(1);
  });

  it('never keeps a full card number', async () => {
    const t = makeDeps([bank('Purchase SAR 45.00 at Starbucks, card 4111111111111234')]);
    await processCaptured(t.deps);
    expect(t.handled[0]).toContain('****1234');
    expect(t.handled[0]).not.toContain('4111111111111234');
  });

  it('merges a Wallet payment with its bank message into one transaction', async () => {
    const t = makeDeps([wallet({ merchant: 'Starbucks', amount: '45.00', card: '1234' }, NOW), bank(PURCHASE, NOW + 5_000)]);
    await processCaptured(t.deps);
    expect(t.handled).toHaveLength(1); // the bank message
    expect(t.held()).toHaveLength(0); // the Wallet copy was dropped
    expect(t.savedWallet).toHaveLength(0);
  });

  it('drops a Wallet payment whose bank message was already saved', async () => {
    const t = makeDeps([wallet({ merchant: 'Starbucks', amount: '45.00', card: '1234' })], {
      savedDebitNear: async (_p, _w, walletRows) => !walletRows,
    });
    expect(await processCaptured(t.deps)).toMatchObject({ dropped: 1, held: 0 });
  });

  it('saves a complete Wallet payment on its own once the wait for the SMS is over', async () => {
    const item = wallet({ merchant: 'Starbucks', amount: '45.00', card: '1234' }, NOW);
    const early = makeDeps([item], {}, NOW + 30_000);
    await processCaptured(early.deps);
    expect(early.savedWallet).toHaveLength(0);
    expect(early.held()).toHaveLength(1);

    const late = makeDeps([], { readHeld: async () => early.held() }, NOW + DEFAULT_CAPTURE_CONFIG.walletHoldMs + 1);
    await processCaptured(late.deps);
    expect(late.savedWallet).toHaveLength(1);
    expect(late.held()).toHaveLength(0);
  });

  it('holds an empty-merchant or zero-amount Wallet item, then asks the user to complete it', async () => {
    const item = wallet({ merchant: '', amount: '0', card: '1234' }, NOW);
    const first = makeDeps([item], {}, NOW + 1_000);
    expect(await processCaptured(first.deps)).toMatchObject({ held: 1, failed: 0 });
    expect(first.held()[0].needsCompletion).toBeUndefined();

    const later = makeDeps([], { readHeld: async () => first.held() }, NOW + DEFAULT_CAPTURE_CONFIG.incompleteWaitMs + 1);
    await processCaptured(later.deps);
    expect(later.held()[0].needsCompletion).toBe(true);
    expect(later.savedWallet).toHaveLength(0);
  });

  it('leaves an item in the queue when handling it fails, so it is retried', async () => {
    const item = bank(PURCHASE);
    const t = makeDeps([item], {
      handleSms: async () => {
        throw new Error('database locked');
      },
    });
    expect(await processCaptured(t.deps)).toMatchObject({ failed: 1, handled: 0 });
    expect(t.acked).toEqual([]);
  });
});
