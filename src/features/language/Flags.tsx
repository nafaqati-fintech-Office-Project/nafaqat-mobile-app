import Svg, { ClipPath, Circle, Defs, G, Path, Rect } from 'react-native-svg';

import type { Language } from '@/i18n';
import { colors, sizes } from '@/theme';
import { svgA11y } from '@/components/svgA11y';

const WHITE = colors.white;

function UkFlag() {
  return (
    <>
      <Defs>
        <ClipPath id="clipUk">
          <Circle cx={30} cy={30} r={30} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#clipUk)">
        <Rect width={60} height={60} fill={colors.flagUkBlue} />
        <Path d="M0 0L60 60M60 0L0 60" stroke={WHITE} strokeWidth={10} />
        <Path d="M0 0L60 60M60 0L0 60" stroke={colors.flagUkRed} strokeWidth={4} />
        <Path d="M30 0V60M0 30H60" stroke={WHITE} strokeWidth={16} />
        <Path d="M30 0V60M0 30H60" stroke={colors.flagUkRed} strokeWidth={9} />
      </G>
    </>
  );
}

function SaudiFlag() {
  return (
    <>
      <Defs>
        <ClipPath id="clipSa">
          <Circle cx={30} cy={30} r={30} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#clipSa)">
        <Rect width={60} height={60} fill={colors.flagSaGreen} />
        <Path d="M16 24H44" stroke={WHITE} strokeWidth={4} strokeDasharray="5 3" />
        <Path d="M14 40H46M40 36V44" stroke={WHITE} strokeWidth={3} strokeLinecap="round" />
      </G>
    </>
  );
}

export function Flag({ language }: { language: Language }) {
  return (
    <Svg width={sizes.flag} height={sizes.flag} viewBox="0 0 60 60" {...svgA11y()}>
      {language === 'en' ? <UkFlag /> : <SaudiFlag />}
    </Svg>
  );
}
