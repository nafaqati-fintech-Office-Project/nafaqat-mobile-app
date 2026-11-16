import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { describeFailure } from './describeFailure';

const config = { method: 'get', url: '/api/reports/monthly-comparison' } as never;

describe('describeFailure', () => {
  it('names the status, the gateway code and the request', () => {
    const response = { status: 403, data: { error: 'PREMIUM_REQUIRED' } } as never;
    const error = new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, {}, response);
    expect(describeFailure(error)).toBe('403 PREMIUM_REQUIRED GET /api/reports/monthly-comparison');
  });

  it('says when there was no response at all', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK', config);
    expect(describeFailure(error)).toBe('no response (ERR_NETWORK) GET /api/reports/monthly-comparison');
  });

  it('handles a plain error', () => {
    expect(describeFailure(new Error('boom'))).toBe('boom');
    expect(describeFailure('x')).toBe('unknown error');
  });
});
