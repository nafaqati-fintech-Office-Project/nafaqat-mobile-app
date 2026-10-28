import * as Notifications from 'expo-notifications';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildNotificationContent, notifyTransaction } from '../notifications/notify';
import type { ParsedTxn } from './parser/types';
import { processSms } from './processSms';

vi.mock('expo-notifications', () => ({
  scheduleNotificationAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  AndroidImportance: { DEFAULT: 3 },
}));
vi.mock('./smsReader', () => ({ readInbox: vi.fn() }));
// The real api client loads Expo modules; these tests never reach the model, so it is offline.
vi.mock('@/api/client', () => ({ api: { post: vi.fn().mockRejectedValue(new Error('offline')) } }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn().mockResolvedValue(null), setItem: vi.fn().mockResolvedValue(undefined) },
}));

const txn = (overrides: Partial<ParsedTxn> = {}): ParsedTxn => ({
  smsId: '1',
  bank: 'HBL',
  type: 'DEBIT',
  amount: '1250.00',
  currency: 'PKR',
  merchant: 'KFC LAHORE',
  cardLast4: '1234',
  date: 0,
  raw: 'SECRET RAW BODY',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('processSms', () => {
  it('returns null for an OTP', async () => {
    const sms = { id: '1', address: 'MEEZAN', body: 'Your Meezan OTP is 482913.', date: 1 };
    expect(await processSms(sms)).toBeNull();
  });

  it('parses and categorizes a transaction', async () => {
    const sms = {
      id: '2',
      address: 'MEEZAN',
      body: 'Meezan Card ending 1234: purchase of Rs. 1,250.00 at KFC LAHORE on 12-May-26.',
      date: 1,
    };
    const result = await processSms(sms);
    expect(result).toMatchObject({ category: 'Food & Beverage', source: 'lookup' });
    expect(result?.txn.amount).toBe('1250.00');
  });
});

describe('notification content', () => {
  it('formats a debit with merchant and card', () => {
    expect(buildNotificationContent(txn(), 'Food & Beverage')).toEqual({
      title: '1250.00 PKR · KFC LAHORE',
      body: 'Food & Beverage · Debit · card ****1234',
    });
  });

  it('formats a credit as Income', () => {
    expect(buildNotificationContent(txn({ type: 'CREDIT', merchant: 'ALI RAZA' }), 'Income')).toEqual({
      title: '1250.00 PKR · ALI RAZA',
      body: 'Income · Credit · card ****1234',
    });
  });

  it('uses the bank when there is no merchant', () => {
    expect(buildNotificationContent(txn({ merchant: null }), 'Uncategorized').title).toBe(
      '1250.00 PKR · HBL',
    );
  });

  it('omits the card when there is none', () => {
    expect(buildNotificationContent(txn({ cardLast4: null }), 'Fuel').body).toBe('Fuel · Debit');
  });

  it('never sends the raw SMS body', async () => {
    await notifyTransaction({ txn: txn(), category: 'Fuel' });
    const call = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls[0][0];
    expect(JSON.stringify(call)).not.toContain('SECRET RAW BODY');
  });
});

describe('listener dedupe', () => {
  it('processes the same sms id only once', async () => {
    vi.resetModules();
    const { readInbox } = await import('./smsReader');
    const { scanInbox, startSmsListener, stopSmsListener } = await import('./listener');
    const sms = { id: '7', address: 'HBL', body: 'x', date: 5 };
    vi.mocked(readInbox).mockResolvedValue([sms]);
    const onSms = vi.fn();

    startSmsListener(onSms);
    await vi.waitFor(() => expect(onSms).toHaveBeenCalledTimes(1));
    await scanInbox();
    await scanInbox();
    stopSmsListener();

    expect(onSms).toHaveBeenCalledTimes(1);
  });
});
