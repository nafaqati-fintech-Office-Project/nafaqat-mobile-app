import { useEffect, useState } from 'react';
import { Animated, I18nManager, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ResolvedElement, ResolvedScreen } from './types';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { colors, fontSizes, spacing } from '@/theme';

// A drawn imitation of the iPhone Shortcuts app. It is made of normal app layouts (not screenshots), so it follows the
// app language and text size. The colours imitate iOS on purpose and are not the Nafaqati theme.
const ios = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  blue: '#007AFF',
  gray: '#8E8E93',
  separator: '#E5E5EA',
  green: '#34C759',
  bubble: '#E9E9EB',
  text: '#000000',
  red: '#FF3B30',
} as const;

type Props = {
  screen: ResolvedScreen;
  /** The element the user has to tap: it gets a pulsing outline. */
  targetId: string;
  /** Text shown inside an element after it was tapped (the keyword typed in, "Selected"). */
  fill: { elementId: string; text: string } | null;
  /** Read aloud for the highlighted element. */
  instruction: string;
  onTap: (elementId: string) => void;
};

function Pulse({ radius = 10 }: { radius?: number }) {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View pointerEvents="none" style={[styles.pulse, { borderRadius: radius, opacity }]} />;
}

type TappableProps = {
  id: string;
  label: string;
  targetId: string;
  instruction: string;
  onTap: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  children: React.ReactNode;
};

function Tappable({ id, label, targetId, instruction, onTap, style, radius, children }: TappableProps) {
  const isTarget = id === targetId;
  return (
    <Pressable
      onPress={() => onTap(id)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={isTarget ? instruction : undefined}
      style={style}>
      {children}
      {isTarget && <Pulse radius={radius} />}
    </Pressable>
  );
}

function Chevron() {
  return (
    <View style={I18nManager.isRTL && styles.flip}>
      <Icon name="chevron" color={ios.gray} size={14} strokeWidth={2.4} />
    </View>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <View style={[styles.switchTrack, on && styles.switchTrackOn]}>
      <View style={[styles.switchKnob, on ? styles.switchKnobOn : styles.switchKnobOff]} />
    </View>
  );
}

export function SimScreenView({ screen, targetId, fill, instruction, onTap }: Props) {
  const shared = { targetId, instruction, onTap };
  const body = screen.elements.filter((el) => el.kind !== 'tabbar');
  const tabbar = screen.elements.find((el) => el.kind === 'tabbar');
  const filled = (el: ResolvedElement) => (fill?.elementId === el.id ? fill.text : null);

  const renderElement = (el: ResolvedElement) => {
    const label = el.label ?? '';
    switch (el.kind) {
      case 'text':
        return (
          <AppText key={el.id} style={styles.note}>
            {label}
          </AppText>
        );
      case 'sms':
        return (
          <View key={el.id} style={styles.smsWrap}>
            <AppText style={styles.smsFrom}>{label}</AppText>
            <View style={styles.bubble}>
              <AppText style={styles.bubbleText}>{el.value}</AppText>
            </View>
          </View>
        );
      case 'txn':
        return (
          <View key={el.id} style={styles.card}>
            <View style={styles.txnText}>
              <AppText weight="semibold" style={styles.cardLabel}>
                {label}
              </AppText>
              <AppText style={styles.caption}>{el.caption}</AppText>
            </View>
            <AppText weight="semibold" style={styles.amount}>
              {el.value}
            </AppText>
          </View>
        );
      case 'button':
        return (
          <Tappable key={el.id} id={el.id} label={label} radius={14} style={styles.button} {...shared}>
            <AppText weight="semibold" style={styles.buttonText}>
              {label}
            </AppText>
          </Tappable>
        );
      case 'toggle':
        return (
          <Tappable key={el.id} id={el.id} label={label} style={styles.card} {...shared}>
            <AppText style={[styles.cardLabel, styles.grow]}>{label}</AppText>
            <Switch on={el.on === true} />
          </Tappable>
        );
      case 'field': {
        const typed = filled(el);
        return (
          <Tappable key={el.id} id={el.id} label={label} style={styles.card} {...shared}>
            <AppText style={styles.cardLabel}>{label}</AppText>
            <AppText weight={typed ? 'semibold' : 'regular'} style={[styles.value, styles.grow, typed ? styles.typed : null]}>
              {typed ?? el.value}
            </AppText>
          </Tappable>
        );
      }
      default: {
        const shown = filled(el) ?? el.value;
        return (
          <Tappable key={el.id} id={el.id} label={label} style={styles.card} {...shared}>
            <View style={styles.grow}>
              <AppText style={styles.cardLabel}>{label}</AppText>
              {el.caption ? <AppText style={styles.caption}>{el.caption}</AppText> : null}
            </View>
            {shown ? (
              <AppText weight={filled(el) ? 'semibold' : 'regular'} style={[styles.value, filled(el) ? styles.typed : null]}>
                {shown}
              </AppText>
            ) : null}
            {el.chevron ? <Chevron /> : null}
          </Tappable>
        );
      }
    }
  };

  return (
    <View style={styles.phone}>
      <View style={styles.navBar}>
        <View style={styles.navSide}>
          {screen.navLeft && (
            <Tappable id={screen.navLeft.id} label={screen.navLeft.label} radius={8} style={styles.navButton} {...shared}>
              <AppText style={styles.navText}>{screen.navLeft.label}</AppText>
            </Tappable>
          )}
        </View>
        <AppText weight="semibold" numberOfLines={1} style={styles.navTitle}>
          {screen.title}
        </AppText>
        <View style={[styles.navSide, styles.navSideEnd]}>
          {screen.navRight && (
            <Tappable id={screen.navRight.id} label={screen.navRight.label} radius={8} style={styles.navButton} {...shared}>
              <AppText weight="semibold" style={styles.navText}>
                {screen.navRight.label}
              </AppText>
            </Tappable>
          )}
        </View>
      </View>
      <View style={styles.body}>{body.map(renderElement)}</View>
      {tabbar && (
        <View style={styles.tabbar}>
          {tabbar.tabs?.map((tab) => (
            <Tappable key={tab.id} id={tab.id} label={tab.label} radius={8} style={styles.tab} {...shared}>
              <AppText
                weight={tab.id === tabbar.active ? 'semibold' : 'regular'}
                style={[styles.tabText, tab.id === tabbar.active && styles.tabActive]}>
                {tab.label}
              </AppText>
            </Tappable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    flex: 1,
    minHeight: 380,
    backgroundColor: ios.background,
    borderRadius: 28,
    borderWidth: 6,
    borderColor: colors.phoneFrame,
    overflow: 'hidden',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ios.separator,
    backgroundColor: ios.card,
  },
  navSide: { flex: 1, flexDirection: 'row' },
  navSideEnd: { justifyContent: 'flex-end' },
  navButton: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  navText: { color: ios.blue, fontSize: fontSizes.md },
  navTitle: { flex: 2, textAlign: 'center', fontSize: fontSizes.md, color: ios.text },
  body: { flex: 1, padding: spacing.md, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: ios.card,
  },
  grow: { flex: 1 },
  cardLabel: { fontSize: fontSizes.md, color: ios.text },
  caption: { fontSize: fontSizes.xs, color: ios.gray },
  value: { fontSize: fontSizes.sm, color: ios.gray, textAlign: 'right' },
  typed: { color: ios.blue },
  note: { fontSize: fontSizes.sm, color: ios.gray, paddingHorizontal: spacing.xs },
  txnText: { flex: 1 },
  amount: { fontSize: fontSizes.md, color: ios.red },
  smsWrap: { gap: spacing.xs, alignItems: 'flex-start' },
  smsFrom: { fontSize: fontSizes.xs, color: ios.gray, paddingHorizontal: spacing.sm },
  bubble: { maxWidth: '90%', padding: spacing.md, borderRadius: 18, backgroundColor: ios.bubble },
  bubbleText: { fontSize: fontSizes.sm, color: ios.text },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: ios.blue,
  },
  buttonText: { color: colors.white, fontSize: fontSizes.md },
  tabbar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ios.separator,
    backgroundColor: ios.card,
  },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: fontSizes.xs, color: ios.gray },
  tabActive: { color: ios.blue },
  pulse: { ...StyleSheet.absoluteFill, borderWidth: 2.5, borderColor: ios.blue },
  flip: { transform: [{ scaleX: -1 }] },
  switchTrack: { width: 46, height: 28, borderRadius: 14, backgroundColor: ios.separator, justifyContent: 'center' },
  switchTrackOn: { backgroundColor: ios.green },
  switchKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white },
  switchKnobOff: { marginStart: 2 },
  switchKnobOn: { marginStart: 20 },
});
