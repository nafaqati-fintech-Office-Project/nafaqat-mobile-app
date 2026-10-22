import type { FeatureKey } from '@/components/FeatureChip';
import type { TranslationKey } from '@/i18n';

export type Slide = {
  key: string;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  highlighted: FeatureKey;
};

type SlideName = 'welcome' | 'categorize' | 'insights' | 'secure';

const slide = (name: SlideName, highlighted: FeatureKey): Slide => ({
  key: name,
  titleKey: `onboarding.${name}.title`,
  subtitleKey: `onboarding.${name}.subtitle`,
  highlighted,
});

export const slides: Slide[] = [
  slide('welcome', 'sms'),
  slide('categorize', 'ai'),
  slide('insights', 'insights'),
  slide('secure', 'secure'),
];
