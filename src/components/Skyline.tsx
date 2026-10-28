import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, gradients } from '@/theme';
import { svgA11y } from './svgA11y';

// Simplified Riyadh skyline (Kingdom Centre + Al Faisaliah); no raster asset exists yet.
const FAR =
  'M0 160V110h18V96h16v14h14V84h20v76zM70 160V70h14v-8h10v8h14v90zM270 160V88h18v-12h14v12h16v72zM320 160V100h20V80h20v80z';
const NEAR =
  'M0 160v-30h26v-16h22v46zM52 160V120h24v40zM86 160V96h22v64zM112 160L134 54l22 106zM166 160V106h20v54zM196 160V40Q216 0 236 40v120zM206 72Q216 50 226 72v14h-20zM244 160V112h26v48zM276 160V124h30v36zM312 160V108h22v52zM338 160V128h22v32z';

export function Skyline() {
  const [farTop, farBottom] = gradients.skylineFar;
  const [nearTop, nearBottom] = gradients.skylineNear;
  const [glowTop, glowBottom] = gradients.splashGlow;

  return (
    <Svg
      style={styles.svg}
      viewBox="0 0 360 160"
      preserveAspectRatio="xMidYMax slice"
      {...svgA11y()}>
      <Defs>
        <LinearGradient id="skyGlow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={glowTop} />
          <Stop offset="1" stopColor={glowBottom} />
        </LinearGradient>
        <LinearGradient id="skyFar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={farTop} stopOpacity={0.7} />
          <Stop offset="1" stopColor={farBottom} />
        </LinearGradient>
        <LinearGradient id="skyNear" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={nearTop} />
          <Stop offset="1" stopColor={nearBottom} />
        </LinearGradient>
      </Defs>
      <Path d="M0 40h360v120H0z" fill="url(#skyGlow)" />
      <Path d={FAR} fill="url(#skyFar)" />
      <Path d={NEAR} fill="url(#skyNear)" fillRule="evenodd" />
      <Circle cx={134} cy={84} r={7} fill={colors.violet} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    height: '38%',
  },
});
