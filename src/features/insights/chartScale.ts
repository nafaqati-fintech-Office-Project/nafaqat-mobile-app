// Scale helpers for the spending trend chart. Display only, so plain number math is fine here.

const TICK_COUNT = 3;

// The smallest "nice" step (1, 2 or 5 times a power of ten) that fits the peak in TICK_COUNT steps.
export function niceStep(peak: number): number {
  if (!(peak > 0)) return 1;
  const raw = peak / TICK_COUNT;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].find((m) => m * power >= raw) ?? 10;
  return step * power;
}

// Axis values from 0 up to the first nice value at or above the peak, e.g. 0, 2000, 4000, 6000.
export function yTicks(peak: number): number[] {
  const step = niceStep(peak);
  const top = Math.max(step, Math.ceil(peak / step) * step);
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step) ticks.push(value);
  return ticks;
}

// Compact axis label: 6000 -> 6K, 1500000 -> 1.5M.
export function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${+(value / 1_000).toFixed(1)}K`;
  return String(value);
}

// Points spread across the width (first at the left edge, last at the right); y grows downwards.
export function linePoints(values: number[], top: number, width: number, height: number) {
  const span = Math.max(values.length - 1, 1);
  return values.map((value, i) => ({
    x: values.length === 1 ? width / 2 : (i / span) * width,
    y: height - (top > 0 ? (Math.max(value, 0) / top) * height : 0),
  }));
}
