import { SegmentedTabs, type SegmentedOption } from './SegmentedTabs';
import { FREE_INSIGHT_MONTHS, type Period } from '@/features/insights/insightsBuilder';

// The months a screen's numbers cover, ending with the current one.
const OPTIONS: SegmentedOption<`${Period}`>[] = [
  { value: '1', label: 'insights.range.1' },
  { value: '3', label: 'insights.range.3' },
  { value: '6', label: 'insights.range.6' },
  { value: '12', label: 'insights.range.12' },
];

type Props = {
  value: Period;
  onChange: (period: Period) => void;
  // Free plan: the periods longer than FREE_INSIGHT_MONTHS show a padlock and call onLocked instead of onChange.
  limited?: boolean;
  onLocked?: () => void;
};

export function PeriodTabs({ value, onChange, limited = false, onLocked }: Props) {
  const options = OPTIONS.map((option) => ({ ...option, locked: limited && Number(option.value) > FREE_INSIGHT_MONTHS }));
  return (
    <SegmentedTabs
      options={options}
      value={`${value}`}
      onChange={(next) => {
        const period = Number(next) as Period;
        if (limited && period > FREE_INSIGHT_MONTHS) onLocked?.();
        else onChange(period);
      }}
    />
  );
}
