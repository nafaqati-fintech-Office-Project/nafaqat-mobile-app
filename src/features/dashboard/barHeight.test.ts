import { describe, expect, it } from 'vitest';

import { barHeight } from './barHeight';

describe('barHeight', () => {
  it('scales against the highest day', () => {
    expect(barHeight(400, 400, 110)).toBe(110);
    expect(barHeight(200, 400, 110)).toBe(55);
  });

  it('keeps a small amount visible next to a big one', () => {
    expect(barHeight(1, 5000, 110)).toBe(8);
  });

  it('draws a thin baseline for a day without spending', () => {
    expect(barHeight(0, 400, 110)).toBe(4);
    expect(barHeight(0, 1, 110)).toBe(4);
  });
});
