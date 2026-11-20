// @ts-expect-error The app has no Node type definitions; this test only runs under Vitest (Node).
import { readFileSync, writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import base from '@/features/categorizer/localModelBase.json';
import { activeModelVersion, getLocalModel, resetLocalModel, updateLocalModel } from '@/features/categorizer/localModelStore';
import { resetModelClient } from '@/features/categorizer/modelClient';
import { processSms } from './processSms';

// End to end against a running model server, with real SMS text:
//   E2E_SERVER=http://127.0.0.1:8087 E2E_SMS=D:/.../sms_bodies.json npx vitest run src/features/sms/e2eSaudi.test.ts
// Phone SMS -> parser -> rules -> lookup -> on-device model -> (unsure) the real server and its LLM.
// Skipped unless E2E_SERVER is set. Only the phone's storage and the user's own rules are replaced.
const SERVER = process.env.E2E_SERVER;
const SMS_FILE = process.env.E2E_SMS ?? '';
const REPORT = process.env.E2E_REPORT ?? '';

vi.mock('@/config/flags', () => ({ AUTH_BYPASS: true }));
vi.mock('@/config/env', () => ({
  API_URL: process.env.E2E_SERVER ?? '',
  MERCHANT_FALLBACK_ENABLED: false,
  LLM_ONLY: false,
  GOOGLE_WEB_CLIENT_ID: '',
}));
vi.mock('@/api/client', () => ({ api: {} }));
vi.mock('@/features/transactions/categoryRules', () => ({ findUserCategory: async () => null }));
vi.mock('@/utils/devLog', () => ({ devLog: () => undefined }));
// The phone's document folder, in memory: it starts with an OLDER model than the server's.
const disk = vi.hoisted(() => ({ file: null as string | null }));
vi.mock('expo-file-system', () => ({
  Paths: { document: 'doc' },
  File: class {
    get exists() {
      return disk.file !== null;
    }
    create() {}
    write(text: string) {
      disk.file = text;
    }
    text() {
      return Promise.resolve(disk.file ?? '');
    }
  },
}));

describe.skipIf(!SERVER)('Saudi SMS end to end', () => {
  beforeAll(() => {
    disk.file = JSON.stringify({ ...base, version: 'v-old' });
    resetLocalModel();
    resetModelClient();
  });

  it('the phone downloads the server model, replacing its older one', async () => {
    expect((await getLocalModel()).version).toBe('v-old');
    expect(await updateLocalModel()).toBe('updated');
    expect(activeModelVersion()).not.toBe('v-old');
    expect(JSON.parse(disk.file!).version).toBe(activeModelVersion());
    expect(await updateLocalModel()).toBe('current');
  }, 120_000);

  it('reads 300 real alerts and categorizes them', async () => {
    const bodies: string[] = JSON.parse(readFileSync(SMS_FILE, 'utf-8'));
    const step = Math.floor(bodies.length / 300);
    const sample = bodies.filter((_, i) => i % step === 0).slice(0, 300);
    const rows: Record<string, unknown>[] = [];
    const bySource: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let notSms = 0;
    for (const [i, body] of sample.entries()) {
      const result = await processSms({ id: String(i), address: 'AlRajhiBank', body, date: Date.UTC(2026, 0, 31) });
      if (!result) {
        notSms += 1; // OTPs and bank notices: correctly not transactions
        continue;
      }
      bySource[result.source] = (bySource[result.source] ?? 0) + 1;
      byCategory[result.category] = (byCategory[result.category] ?? 0) + 1;
      rows.push({
        first: body.split('\n')[0],
        merchant: result.txn.merchant,
        amount: `${result.txn.amount} ${result.txn.currency}`,
        type: result.txn.type,
        category: result.category,
        source: result.source,
        confidence: result.confidence?.toFixed(2),
        retry: result.retry,
      });
    }
    if (REPORT) writeFileSync(REPORT, JSON.stringify({ notSms, bySource, byCategory, rows }, null, 1));
    const total = rows.length;
    expect(total).toBeGreaterThan(200);
    // Every real transaction either got a category or is waiting for a retry; none is silently lost.
    expect(rows.filter((r) => r.category === 'Uncategorized' && !r.retry).length / total).toBeLessThan(0.1);
    // The phone answers most merchants itself or from the app's own lists: the server is the exception.
    const local = (bySource.model ?? 0) + (bySource.lookup ?? 0) + (bySource.fallback ?? 0);
    expect(local / total).toBeGreaterThan(0.7);
  }, 600_000);
});
