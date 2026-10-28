import { sizes, spacing } from '@/theme';

const EMPTY_BAR = spacing.xs; // a day with no spending: a thin baseline
const MIN_BAR = spacing.sm; // a day with spending is never thinner than this, however small next to the peak

// Bar height for one day. Scale only: amounts are decimal strings, never added here.
export function barHeight(value: number, peak: number, maxHeight: number = sizes.chartHeight): number {
  if (value <= 0) return EMPTY_BAR;
  return Math.max((value / peak) * maxHeight, MIN_BAR);
}
