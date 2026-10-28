import { describe, expect, it } from 'vitest';

import { compactNumber, linePoints, niceStep, yTicks } from './chartScale';

describe('yTicks', () => {
  it('reaches the first nice value above the peak', () => {
    expect(yTicks(4480)).toEqual([0, 2000, 4000, 6000]);
    expect(yTicks(950)).toEqual([0, 500, 1000]);
  });

  it('still draws one step when there is no spending', () => {
    expect(niceStep(0)).toBe(1);
    expect(yTicks(0)).toEqual([0, 1]);
  });
});

describe('compactNumber', () => {
  it('shortens thousands and millions', () => {
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(500)).toBe('500');
    expect(compactNumber(6000)).toBe('6K');
    expect(compactNumber(2500)).toBe('2.5K');
    expect(compactNumber(1_500_000)).toBe('1.5M');
  });
});

describe('linePoints', () => {
  it('spreads points edge to edge and scales y to the top tick', () => {
    expect(linePoints([0, 3000, 6000], 6000, 200, 100)).toEqual([
      { x: 0, y: 100 },
      { x: 100, y: 50 },
      { x: 200, y: 0 },
    ]);
  });

  it('centres a single point', () => {
    expect(linePoints([10], 20, 200, 100)).toEqual([{ x: 100, y: 50 }]);
  });
});
