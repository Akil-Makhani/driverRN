/**
 * Fireworks over the trip screen once a delivery goes through - a small
 * "well done" for the driver before they are taken back to the dashboard.
 *
 * Built on React Native's Animated with the native driver (transform and
 * opacity only), so it needs nothing beyond what the app already ships and
 * stays smooth while the JS thread is busy refetching the dashboard.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppColors } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { formatRupees } from '@/core/utils/number-format';

interface Props {
  visible: boolean;
  /** What the trip paid; left out when it carries no fare. */
  earning?: number;
  onDone: () => void;
}

/** Back to the dashboard on its own after this long. */
const AUTO_CLOSE_MS = 3000;
const BURSTS = 7;
const SPARKS = 22;
const COLORS = ['#FFD54A', '#FF5C8A', '#4DD9FF', '#7CFF6B', '#FF9F43', '#B388FF', '#FFFFFF'];

interface Burst {
  x: number;
  y: number;
  color: string;
  /** A second colour for every other spark. */
  accent: string;
  radius: number;
  delay: number;
}

export function DeliveryCelebration({ visible, earning, onDone }: Props) {
  const { width, height } = useWindowDimensions();

  // New positions each time it opens, so no two deliveries look alike.
  const bursts = useMemo<Burst[]>(
    () =>
      Array.from({ length: BURSTS }, (_, i) => ({
        x: width * (0.12 + Math.random() * 0.76),
        y: height * (0.1 + Math.random() * 0.32),
        color: COLORS[i % COLORS.length],
        accent: COLORS[(i + 3) % COLORS.length],
        radius: 70 + Math.random() * 50,
        delay: i * 320 + Math.random() * 200,
      })),
    [visible, width, height],
  );

  const card = useRef(new Animated.Value(0)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!visible) return;
    card.setValue(0);
    Animated.spring(card, {
      toValue: 1,
      friction: 5,
      tension: 60,
      delay: 250,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => onDoneRef.current(), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [visible, card]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDone}>
      <Pressable style={styles.backdrop} onPress={onDone}>
        {visible &&
          bursts.map((b, i) => <Firework key={i} burst={b} groundY={height} />)}

        <Animated.View
          style={[
            styles.card,
            {
              opacity: card,
              transform: [
                { scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
            },
          ]}
        >
          <View style={styles.tick}>
            <Ionicons name="checkmark" size={46} color={AppColors.white} />
          </View>
          <Text style={styles.title}>{Strings.deliveredCelebrateTitle}</Text>
          <Text style={styles.body}>{Strings.deliveredCelebrateBody}</Text>
          {earning != null && (
            <View style={styles.earning}>
              <Text style={styles.earningLabel}>{Strings.tripEarning}</Text>
              <Text style={styles.earningAmount}>
                {`${Strings.rupeesSign}${formatRupees(earning)}`}
              </Text>
            </View>
          )}
          <Pressable onPress={onDone} style={styles.done}>
            <Text style={styles.doneText}>{Strings.deliveredCelebrateDone}</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/**
 * One firework, on a loop: a rocket climbs from the bottom of the screen,
 * bursts into a ring of sparks that drift down as they fade, then waits and
 * goes again.
 */
function Firework({ burst, groundY }: { burst: Burst; groundY: number }) {
  const rocket = useRef(new Animated.Value(0)).current;
  const blast = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rocket, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blast, {
          toValue: 1,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ]),
    );
    const start = setTimeout(() => loop.start(), burst.delay);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [rocket, blast, burst.delay]);

  // Sparks fly out fast and slow down (ease-out), then gravity takes them.
  const spread = [0, 0.18, 0.45, 1];
  const reach = [0, 0.6, 0.88, 1];
  const fall = [0, 2, 12, 46];

  return (
    <View pointerEvents="none" style={[styles.origin, { left: burst.x, top: burst.y }]}>
      {/* The rocket's climb, hidden once it bursts. */}
      <Animated.View
        style={[
          styles.rocket,
          {
            backgroundColor: burst.color,
            opacity: rocket.interpolate({ inputRange: [0, 0.1, 0.95, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              {
                translateY: rocket.interpolate({
                  inputRange: [0, 1],
                  outputRange: [groundY - burst.y, 0],
                }),
              },
            ],
          },
        ]}
      />

      {/* The flash at the moment it bursts. */}
      <Animated.View
        style={[
          styles.flash,
          {
            backgroundColor: burst.color,
            opacity: blast.interpolate({ inputRange: [0, 0.05, 0.3], outputRange: [0, 0.9, 0], extrapolate: 'clamp' }),
            transform: [{ scale: blast.interpolate({ inputRange: [0, 0.3], outputRange: [0.2, 2.4], extrapolate: 'clamp' }) }],
          },
        ]}
      />

      {Array.from({ length: SPARKS }, (_, i) => {
        const angle = (i / SPARKS) * Math.PI * 2;
        // Every other spark goes a little shorter, for a double ring.
        const r = burst.radius * (i % 2 ? 0.72 : 1);
        const dx = Math.cos(angle) * r;
        const dy = Math.sin(angle) * r;
        return (
          <Animated.View
            key={i}
            style={[
              styles.spark,
              {
                backgroundColor: i % 2 ? burst.accent : burst.color,
                opacity: blast.interpolate({
                  inputRange: [0, 0.02, 0.65, 1],
                  outputRange: [0, 1, 0.9, 0],
                }),
                transform: [
                  { translateX: blast.interpolate({ inputRange: spread, outputRange: reach.map((k) => k * dx) }) },
                  {
                    translateY: blast.interpolate({
                      inputRange: spread,
                      outputRange: reach.map((k, j) => k * dy + fall[j]),
                    }),
                  },
                  { scale: blast.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1.2, 1, 0.3] }) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 18, 32, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  origin: { position: 'absolute', width: 0, height: 0 },
  rocket: { position: 'absolute', left: -2, top: -8, width: 4, height: 16, borderRadius: 2 },
  flash: { position: 'absolute', left: -14, top: -14, width: 28, height: 28, borderRadius: 14 },
  spark: { position: 'absolute', left: -3, top: -3, width: 6, height: 6, borderRadius: 3 },
  card: {
    position: 'absolute',
    bottom: 70,
    left: 24,
    right: 24,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 20,
    borderRadius: 20,
    backgroundColor: AppColors.white,
  },
  tick: {
    position: 'absolute',
    top: -38,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: AppColors.white,
    backgroundColor: AppColors.success500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.h3.extraBold, color: AppColors.text, textAlign: 'center' },
  body: { ...Typography.body1.medium, color: AppColors.text, textAlign: 'center', marginTop: 6 },
  earning: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.success300,
    backgroundColor: AppColors.success50,
  },
  earningLabel: { ...Typography.body2.semiBold, color: AppColors.text },
  earningAmount: { ...Typography.h2.extraBold, color: AppColors.success500, marginTop: 2 },
  done: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: AppColors.primary,
  },
  doneText: { ...Typography.button2.extraBold, color: AppColors.white },
});
