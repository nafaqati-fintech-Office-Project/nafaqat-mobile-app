import { beforeEach, describe, expect, it, vi } from 'vitest';

import { categorizeMerchant } from './categorize';
import { resetLocalModel, updateLocalModel } from './localModelStore';
import { resetModelClient } from './modelClient';
import base from './localModelBase.json';

const post = vi.hoisted(() => vi.fn());
const get = vi.hoisted(() => vi.fn());
vi.mock('@/api/client', () => ({ api: { post, get } }));
vi.mock('@/config/flags', () => ({ AUTH_BYPASS: false }));
// The app's own merchant list answers many names first; this test is about the model step after it.
vi.mock('./lookup', () => ({ lookupCategory: () => null }));
vi.mock('@/features/transactions/categoryRules', () => ({ findUserCategory: vi.fn() }));
// A downloaded model is kept in a file; the tests have none.
const files = vi.hoisted(() => ({ written: null as string | null }));
vi.mock('expo-file-system', () => ({
  Paths: { document: 'doc' },
  File: class {
    exists = false;
    create() {}
    write(text: string) {
      files.written = text;
    }
    text() {
      return Promise.resolve(files.written ?? '');
    }
  },
}));

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  files.written = null;
  resetModelClient();
  resetLocalModel();
});

describe('merchant model on the phone', () => {
  it('answers a known merchant itself, with no server call', async () => {
    const result = await categorizeMerchant('Pharmacy Mall');
    expect(result).toMatchObject({ category: 'Health', source: 'model' });
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(post).not.toHaveBeenCalled();
  });

  it('asks the server (and its LLM) when the model is unsure', async () => {
    post.mockResolvedValue({ data: { category: 'Entertainment', confidence: 0.8, prediction_source: 'llm', prediction_id: 'a'.repeat(32) } });
    const result = await categorizeMerchant('ZQXJ WKVP');
    expect(post).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ category: 'Entertainment', source: 'llm' });
  });
});

describe('model updates', () => {
  const next = { ...(base as object), version: 'v-next' };

  it('keeps the model when the server runs the same version', async () => {
    get.mockResolvedValueOnce({ data: { version: base.version, format: 1 } });
    expect(await updateLocalModel()).toBe('current');
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('downloads and uses a newer model', async () => {
    get.mockResolvedValueOnce({ data: { version: 'v-next', format: 1 } }).mockResolvedValueOnce({ data: next });
    expect(await updateLocalModel()).toBe('updated');
    expect(files.written).toContain('v-next');
  });

  it('ignores a model in a format this app does not know, and a broken download', async () => {
    get.mockResolvedValueOnce({ data: { version: 'v-next', format: 2 } });
    expect(await updateLocalModel()).toBe('unsupported');
    get.mockResolvedValueOnce({ data: { version: 'v-next', format: 1 } }).mockResolvedValueOnce({ data: { nope: true } });
    expect(await updateLocalModel()).toBe('failed');
    get.mockRejectedValueOnce(new Error('offline'));
    expect(await updateLocalModel()).toBe('failed');
  });
});
