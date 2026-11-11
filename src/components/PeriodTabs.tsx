import { SegmentedTabs, type SegmentedOption } from './SegmentedTabs';
import type { Period } from '@/features/insights/insightsBuilder';

// The months a screen's numbers cover, ending with the current one.
const OPTIONS: SegmentedOption<`${Period}`>[] = [
  { value: '1', label: 'insights.range.1' },
  { value: '3', label: 'insights.range.3' },
  { value: '6', label: 'insights.range.6' },
  { value: '12', label: 'insights.range.12' },
];

export function PeriodTabs({ value, onChange }: { value: Period; onChange: (period: Period) => void }) {
  return <SegmentedTabs options={OPTIONS} value={`${value}`} onChange={(next) => onChange(Number(next) as Period)} />;
}
