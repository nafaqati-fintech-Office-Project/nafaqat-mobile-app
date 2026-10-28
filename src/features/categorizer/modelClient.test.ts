import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/api/client', () => ({ api: { post } }));
vi.mock('@/config/flags', () => ({ AUTH_BYPASS: false }));

// What axios throws for an HTTP error: isAxiosError is the flag its own isAxiosError() checks.
const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status } });

beforeEach(async () => {
  post.mockReset();
  (await import('./modelClient')).resetModelClient();
});

describe('signed in: through the gateway', () => {
  it('posts to the ai-service route with a timeout', async () => {
    const { predictCategory } = await import('./modelClient');
    post.mockResolvedValue({ data: { category: 'Health', confidence: 0.8, prediction_source: 'ml' } });
    expect(await predictCategory('ZZQX SHOP')).toEqual({ category: 'Health', confidence: 0.8, predictionSource: 'ml' });
    expect(post).toHaveBeenCalledWith('/api/ai-service/predict', { text: 'ZZQX SHOP' }, { timeout: 15000 });
  });

  it('reports an unexpected response shape as rejected', async () => {
    const { predictCategory } = await import('./modelClient');
    post.mockResolvedValue({ data: { category: 'Health' } });
    expect(await predictCategory('ZZQX SHOP')).toBe('rejected');
    post.mockResolvedValue({ data: '<html>' });
    expect(await predictCategory('ZZQX SHOP')).toBe('rejected');
  });

  it('reports no reply, an expired session, rate limiting or the model being down as unavailable', async () => {
    const { extractMerchant, predictCategory, resetModelClient } = await import('./modelClient');
    // 401 means the refresh in the api client already failed; 503/504 are the gateway's circuit breaker fallback.
    for (const status of [401, 408, 429, 502, 503, 504]) {
      resetModelClient();
      post.mockRejectedValueOnce(httpError(status));
      expect(await predictCategory('ZZQX SHOP')).toBe('unavailable');
      resetModelClient();
      post.mockRejectedValueOnce(httpError(status));
      expect(await extractMerchant('paid at shop')).toBe('unavailable');
    }
    expect(post).toHaveBeenCalledTimes(12);
    resetModelClient();
    post.mockRejectedValueOnce(Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED' }));
    expect(await predictCategory('ZZQX SHOP')).toBe('unavailable');
    resetModelClient();
    post.mockRejectedValueOnce(new Error('Network Error'));
    expect(await predictCategory('ZZQX SHOP')).toBe('unavailable');
  });

  it('reports any other server error as rejected', async () => {
    const { extractMerchant, predictCategory } = await import('./modelClient');
    for (const status of [400, 422, 500]) {
      post.mockRejectedValueOnce(httpError(status));
      expect(await predictCategory('ZZQX SHOP')).toBe('rejected');
      post.mockRejectedValueOnce(httpError(status));
      expect(await extractMerchant('paid at shop')).toBe('rejected');
    }
  });

  it('trims the extracted merchant and ignores a blank one', async () => {
    const { extractMerchant } = await import('./modelClient');
    post.mockResolvedValueOnce({ data: { merchant: '  KFC LAHORE ' } });
    expect(await extractMerchant('paid at kfc')).toEqual({ merchant: 'KFC LAHORE' });
    expect(post).toHaveBeenCalledWith('/api/ai-service/extract-merchant', { text: 'paid at kfc' }, { timeout: 15000 });
    post.mockResolvedValueOnce({ data: { merchant: '  ' } });
    expect(await extractMerchant('paid at a stall')).toEqual({ merchant: null });
  });
});

describe('shared limits', () => {
  const ok = (category: string) => ({ data: { category, confidence: 0.9, prediction_source: 'ml' } });

  it('asks once for a repeated merchant, including while the first call is still running', async () => {
    const { predictCategory } = await import('./modelClient');
    post.mockResolvedValue(ok('Health'));
    const [a, b] = await Promise.all([predictCategory('ZZQX SHOP'), predictCategory('ZZQX SHOP')]);
    const c = await predictCategory('ZZQX SHOP');
    expect([a, b, c]).toEqual([a, a, a]);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('asks again after the cached answer expires', async () => {
    vi.useFakeTimers();
    try {
      const { predictCategory } = await import('./modelClient');
      post.mockResolvedValue(ok('Health'));
      await predictCategory('ZZQX SHOP');
      vi.advanceTimersByTime(10 * 60_000);
      await predictCategory('ZZQX SHOP');
      expect(post).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not keep a refusal, so the next call asks again', async () => {
    const { predictCategory } = await import('./modelClient');
    post.mockRejectedValueOnce(httpError(400)).mockResolvedValueOnce(ok('Health'));
    expect(await predictCategory('ZZQX SHOP')).toBe('rejected');
    expect(await predictCategory('ZZQX SHOP')).toMatchObject({ category: 'Health' });
  });

  it('runs at most three calls at once', async () => {
    const { predictCategory } = await import('./modelClient');
    let active = 0;
    let peak = 0;
    post.mockImplementation(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return ok('Health');
    });
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => predictCategory(`SHOP ${i}`)));
    expect(results.every((r) => typeof r === 'object')).toBe(true);
    expect(post).toHaveBeenCalledTimes(10);
    expect(peak).toBe(3);
  });

  it('fails at once for 30 seconds after the model was unreachable', async () => {
    vi.useFakeTimers();
    try {
      const { extractMerchant, predictCategory } = await import('./modelClient');
      post.mockRejectedValueOnce(httpError(503));
      expect(await predictCategory('SHOP A')).toBe('unavailable');
      expect(await predictCategory('SHOP B')).toBe('unavailable');
      expect(await extractMerchant('paid at shop')).toBe('unavailable');
      expect(post).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(30_000);
      post.mockResolvedValueOnce(ok('Health'));
      expect(await predictCategory('SHOP B')).toMatchObject({ category: 'Health' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('tells listeners once when the model answers again after being unreachable', async () => {
    vi.useFakeTimers();
    try {
      const { onModelAvailable, predictCategory } = await import('./modelClient');
      const listener = vi.fn();
      const unsubscribe = onModelAvailable(listener);

      post.mockResolvedValueOnce(ok('Health'));
      await predictCategory('SHOP A');
      expect(listener).not.toHaveBeenCalled(); // it was never down

      post.mockRejectedValueOnce(httpError(503));
      await predictCategory('SHOP B');
      vi.advanceTimersByTime(30_000);
      post.mockResolvedValue(ok('Health'));
      await predictCategory('SHOP B');
      await predictCategory('SHOP C');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not count a refusal as being unreachable', async () => {
    const { onModelAvailable, predictCategory } = await import('./modelClient');
    const listener = vi.fn();
    const unsubscribe = onModelAvailable(listener);
    post.mockRejectedValueOnce(httpError(400)).mockResolvedValueOnce(ok('Health'));
    await predictCategory('SHOP A');
    await predictCategory('SHOP B');
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('a refusal does not start the cooldown', async () => {
    const { predictCategory } = await import('./modelClient');
    post.mockRejectedValueOnce(httpError(400)).mockResolvedValueOnce(ok('Health'));
    expect(await predictCategory('SHOP A')).toBe('rejected');
    expect(await predictCategory('SHOP B')).toMatchObject({ category: 'Health' });
  });
});

describe('auth bypass: straight to the model server', () => {
  it('uses the model server URL with no gateway prefix', async () => {
    vi.resetModules();
    const direct = vi.fn().mockResolvedValue({ data: { category: 'Fuel', confidence: 0.9, prediction_source: 'ml' } });
    const create = vi.fn(() => ({ post: direct }));
    vi.doMock('@/config/flags', () => ({ AUTH_BYPASS: true }));
    vi.doMock('@/config/env', () => ({ API_URL: 'http://model.test:8000' }));
    vi.doMock('axios', async (importOriginal) => ({ ...(await importOriginal<object>()), create }));

    const { predictCategory } = await import('./modelClient');
    expect(await predictCategory('PSO')).toMatchObject({ category: 'Fuel' });
    expect(create).toHaveBeenCalledWith({ baseURL: 'http://model.test:8000' });
    expect(direct).toHaveBeenCalledWith('/predict', { text: 'PSO' }, { timeout: 15000 });
    expect(post).not.toHaveBeenCalled();
  });
});
