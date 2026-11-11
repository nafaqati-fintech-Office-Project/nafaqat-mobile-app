import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { compactNumber, linePoints, yTicks } from './chartScale';
import type { MonthAmount } from './types';
import { AppText } from '@/components/AppText';
import { svgA11y } from '@/components/svgA11y';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

const PLOT_HEIGHT = 140;
const AXIS_WIDTH = 32;
// Room above the plot for the selected month's label.
const TIP_BAND = 44;
const TIP_WIDTH = 104;
// Keeps the end markers inside the plot.
const INSET = 8;
const MARKER_RADIUS = 4;
const SELECTED_RADIUS = 6;
// Past this many months every other month label is hidden so they do not collide.
const MAX_X_LABELS = 6;
const X_LABEL_WIDTH = 44;

// onOpenMonth: shows a link under the chart that opens the selected month's transactions.
type Props = { months: MonthAmount[]; currency: string; onOpenMonth?: (month: MonthAmount) => void };

// One series, so no legend: the card title names it. Tapping a month (the touch stand-in for hover) moves the
// highlight and its label; it starts on the latest month.
export function TrendChart({ months, currency, onOpenMonth }: Props) {
  const { language, t } = useLanguage();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(months.length - 1);

  const locale = intlLocale(language);
  const values = months.map((m) => Number(m.amount)); // chart scale only, not money math
  const ticks = yTicks(Math.max(...values, 0));
  const top = ticks[ticks.length - 1];
  const plotWidth = Math.max(width - AXIS_WIDTH - INSET * 2, 0);
  const points = linePoints(values, top, plotWidth, PLOT_HEIGHT).map((p) => ({ x: p.x + INSET, y: p.y }));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  const monthDate = (m: MonthAmount) => new Date(m.year, m.month - 1, 1);
  const shortMonth = new Intl.DateTimeFormat(locale, { month: 'short' });
  const longMonth = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const every = months.length > MAX_X_LABELS ? 2 : 1;
  // Distance between neighbouring points: each month's label and tap target are centred on its point.
  const gap = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;

  const active = points[selected];
  const tipLeft = active ? Math.min(Math.max(active.x - TIP_WIDTH / 2, 0), plotWidth + INSET * 2 - TIP_WIDTH) : 0;

  return (
    // Time runs left to right in both languages, like the axis labels.
    <View style={styles.chart} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.body}>
        <View style={styles.axis}>
          {[...ticks].reverse().map((tick) => (
            <AppText key={tick} style={styles.axisLabel}>
              {compactNumber(tick)}
            </AppText>
          ))}
        </View>
        <View style={styles.plotArea}>
          {active && width > 0 && (
            <View style={[styles.tip, { left: tipLeft }]} pointerEvents="none">
              <AppText weight="bold" style={styles.tipValue} numberOfLines={1}>
                {formatMoney(months[selected].amount, currency, language)}
              </AppText>
              <AppText style={styles.tipMonth} numberOfLines={1}>
                {longMonth.format(monthDate(months[selected]))}
              </AppText>
            </View>
          )}
          {width > 0 && (
            <Svg width={plotWidth + INSET * 2} height={PLOT_HEIGHT} style={styles.svg} {...svgA11y()}>
              {ticks.map((tick) => {
                const y = PLOT_HEIGHT - (tick / top) * PLOT_HEIGHT;
                return (
                  <Line
                    key={tick}
                    x1={0}
                    x2={plotWidth + INSET * 2}
                    y1={y}
                    y2={y}
                    stroke={colors.border}
                    strokeWidth={1}
                  />
                );
              })}
              {active && (
                <Line
                  x1={active.x}
                  x2={active.x}
                  y1={0}
                  y2={PLOT_HEIGHT}
                  stroke={colors.primaryDisabled}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              )}
              <Path d={path} stroke={colors.primary} strokeWidth={2} fill="none" strokeLinejoin="round" />
              {points.map((p, i) => (
                <Circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={i === selected ? SELECTED_RADIUS : MARKER_RADIUS}
                  fill={i === selected ? colors.primary : colors.white}
                  stroke={i === selected ? colors.white : colors.primary}
                  strokeWidth={2}
                />
              ))}
            </Svg>
          )}
          {/* Hit targets: one full-height column per month, much bigger than the marker. */}
          <View style={styles.hits}>
            {months.map((m, i) => (
              <Pressable
                key={`${m.year}-${m.month}`}
                onPress={() => setSelected(i)}
                accessibilityRole="button"
                accessibilityState={{ selected: i === selected }}
                accessibilityLabel={`${longMonth.format(monthDate(m))}, ${formatMoney(m.amount, currency, language)}`}
                accessibilityHint={t('insights.chartLabel')}
                style={[styles.hit, { left: points[i].x - gap / 2, width: gap }]}
              />
            ))}
          </View>
        </View>
      </View>
      <View style={[styles.xRow, { marginStart: AXIS_WIDTH }]}>
        {points.map((p, i) => (
          <AppText
            key={`${months[i].year}-${months[i].month}`}
            weight={i === selected ? 'semibold' : 'regular'}
            style={[styles.xLabel, { left: p.x - X_LABEL_WIDTH / 2 }, i === selected && styles.xLabelActive]}
            numberOfLines={1}>
            {(months.length - 1 - i) % every === 0 ? shortMonth.format(monthDate(months[i])) : ''}
          </AppText>
        ))}
      </View>
      {onOpenMonth && months[selected] && (
        <Pressable onPress={() => onOpenMonth(months[selected])} accessibilityRole="link" hitSlop={spacing.sm} style={styles.open}>
          <AppText weight="semibold" style={styles.openText}>
            {t('transactions.viewMonth', { month: longMonth.format(monthDate(months[selected])) })}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { direction: 'ltr', gap: spacing.xs },
  body: { flexDirection: 'row', paddingTop: TIP_BAND },
  axis: { width: AXIS_WIDTH, height: PLOT_HEIGHT, justifyContent: 'space-between' },
  axisLabel: { fontSize: fontSizes.xs - 2, color: colors.textSecondary, marginVertical: -6 },
  plotArea: { flex: 1, height: PLOT_HEIGHT },
  svg: { position: 'absolute', left: 0, top: 0 },
  hits: { position: 'absolute', left: 0, right: 0, bottom: 0, top: -TIP_BAND },
  hit: { position: 'absolute', top: 0, bottom: 0 },
  tip: {
    position: 'absolute',
    top: -TIP_BAND,
    width: TIP_WIDTH,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  tipValue: { fontSize: fontSizes.xs, color: colors.textPrimary },
  tipMonth: { fontSize: fontSizes.xs - 2, color: colors.textSecondary },
  xRow: { height: 16 },
  xLabel: {
    position: 'absolute',
    width: X_LABEL_WIDTH,
    fontSize: fontSizes.xs - 2,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  xLabelActive: { color: colors.primary },
  open: { alignSelf: 'flex-start', paddingTop: spacing.sm },
  openText: { fontSize: fontSizes.sm, color: colors.primary },
});
