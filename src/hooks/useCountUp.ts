import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const DURATION_MS = 450;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// A number that rolls to `target`: from 0 the first time, and from the value it showed when the target changes (so a
// refreshed total slides to its new value instead of jumping). With "reduce motion" on it just shows the target.
export function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  const shown = useRef(0);
  const reduce = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      reduce.current = on;
    });
  }, []);

  useEffect(() => {
    if (reduce.current || !Number.isFinite(target)) {
      shown.current = target;
      setValue(target);
      return undefined;
    }
    const from = shown.current;
    const start = Date.now();
    let frame = 0;
    const step = () => {
      const progress = Math.min(1, (Date.now() - start) / DURATION_MS);
      shown.current = from + (target - from) * easeOut(progress);
      setValue(shown.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}
