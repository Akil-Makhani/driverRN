/**
 * What the driver sees right after answering an offer.
 *
 * Accepted (and won): a full-screen "congratulations" from Tiles Drop Saathi -
 * confetti raining over a pulsing truck badge, with the earning and the route.
 * Rejected: a small card from the bottom that keeps it friendly and asks them
 * to take the next one.
 *
 * Animated with the native driver only, so it needs no new native module.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { addressTitle } from '@/core/utils/maps';
import { formatRupees } from '@/core/utils/number-format';
import { type OfferCheerState, useJobStore } from '@/features/job/job-store';

const ACCEPTED_CLOSE_MS = 3000;
const REJECTED_CLOSE_MS = 4500;

export function OfferCheer() {
  const cheer = useJobStore((s) => s.cheer);
  const dismiss = useJobStore((s) => s.dismissCheer);

  useEffect(() => {
    if (!cheer) return;
    const timer = setTimeout(dismiss, cheer.kind === 'accepted' ? ACCEPTED_CLOSE_MS : REJECTED_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [cheer, dismiss]);

  if (!cheer) return null;
  return cheer.kind === 'accepted' ? (
    <AcceptedCheer cheer={cheer} onDone={dismiss} />
  ) : (
    <RejectedCheer onDone={dismiss} />
  );
}

// ── Accepted ─────────────────────────────────────────────────

const CONFETTI = 36;
const CONFETTI_COLORS = ['#FFD54A', '#FF5C8A', '#4DD9FF', '#FFFFFF', '#FF9F43', '#B388FF', '#7CFF6B'];

function AcceptedCheer({ cheer, onDone }: { cheer: OfferCheerState; onDone: () => void }) {
  const { offer } = cheer;
  const { height } = useWindowDimensions();
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start();
  }, [pop]);

  const pickup = addressTitle(offer.pickupAddress);
  const drop = addressTitle(offer.deliveryAddress);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDone}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDone}>
        <LinearGradient
          colors={['#004B64', '#0B7A6F', '#17B26A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        >
          <ConfettiRain height={height} />

          <View style={styles.center}>
            {/* Rings spreading out from the badge, one after the other. */}
            <View style={styles.badgeWrap}>
              <PulseRing />
              <PulseRing delay={700} />
              <Animated.View
                style={[
                  styles.badge,
                  { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] },
                ]}
              >
                <Ionicons name="bus" size={52} color={AppColors.success500} />
              </Animated.View>
            </View>

            <Animated.View
              style={{
                alignItems: 'center',
                opacity: pop,
                transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
              }}
            >
              <Text style={styles.acceptedTitle}>{Strings.acceptedCheerTitle}</Text>
              <Text style={styles.acceptedBody}>{Strings.acceptedCheerBody}</Text>

              {offer.payout != null && (
                <View style={styles.earningChip}>
                  <Text style={styles.earningChipLabel}>{Strings.offerYouEarn}</Text>
                  <Text style={styles.earningChipAmount}>
                    {`${Strings.rupeesSign}${formatRupees(offer.payout)}`}
                  </Text>
                </View>
              )}

              {(pickup || drop) && (
                <View style={styles.route}>
                  <Ionicons name="radio-button-on" size={14} color="#FFD54A" />
                  <Text style={styles.routeText} numberOfLines={1}>{pickup || Strings.offerPickup}</Text>
                  <Ionicons name="arrow-forward" size={14} color={AppColors.white} style={styles.routeArrow} />
                  <Ionicons name="location" size={14} color="#FF5C8A" />
                  <Text style={styles.routeText} numberOfLines={1}>{drop || Strings.offerDrop}</Text>
                </View>
              )}

              <Text style={styles.brand}>{Strings.cheerFromBrand}</Text>
            </Animated.View>
          </View>

          <Pressable onPress={onDone} style={styles.goButton}>
            <Text style={styles.goText}>{Strings.acceptedCheerAction}</Text>
            <Ionicons name="arrow-forward" size={18} color={AppColors.primary} />
          </Pressable>
        </LinearGradient>
      </Pressable>
    </Modal>
  );
}

/** A gold ring that grows out of the badge and fades, over and over. */
function PulseRing({ delay = 0 }: { delay?: number }) {
  const grow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(grow, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    const start = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [grow, delay]);
  return (
    <Animated.View
      style={[
        styles.ring,
        {
          opacity: grow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
          transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
        },
      ]}
    />
  );
}

/** Paper confetti falling and spinning, each piece on its own loop. */
function ConfettiRain({ height }: { height: number }) {
  const { width } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI }, (_, i) => ({
        x: Math.random() * width,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 6 + Math.random() * 6,
        h: 10 + Math.random() * 8,
        sway: 20 + Math.random() * 30,
        duration: 2200 + Math.random() * 1800,
        delay: Math.random() * 1500,
      })),
    [width],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} height={height} />
      ))}
    </View>
  );
}

function ConfettiPiece({
  piece,
  height,
}: {
  piece: { x: number; color: string; w: number; h: number; sway: number; duration: number; delay: number };
  height: number;
}) {
  const fall = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(fall, { toValue: 1, duration: piece.duration, easing: Easing.linear, useNativeDriver: true }),
    );
    const start = setTimeout(() => loop.start(), piece.delay);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [fall, piece.duration, piece.delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: piece.x,
        top: -20,
        width: piece.w,
        height: piece.h,
        borderRadius: 2,
        backgroundColor: piece.color,
        transform: [
          { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
          {
            translateX: fall.interpolate({
              inputRange: [0, 0.25, 0.5, 0.75, 1],
              outputRange: [0, piece.sway, 0, -piece.sway, 0],
            }),
          },
          { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) },
          { rotateX: fall.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '180deg', '360deg'] }) },
        ],
      }}
    />
  );
}

// ── Rejected ─────────────────────────────────────────────────

function RejectedCheer({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slide, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
    // The thumbs-up gives a little wave, twice.
    Animated.sequence([
      Animated.delay(350),
      Animated.loop(
        Animated.sequence([
          Animated.timing(wave, { toValue: 1, duration: 160, useNativeDriver: true }),
          Animated.timing(wave, { toValue: -1, duration: 160, useNativeDriver: true }),
          Animated.timing(wave, { toValue: 0, duration: 160, useNativeDriver: true }),
        ]),
        { iterations: 2 },
      ),
    ]).start();
  }, [slide, wave]);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onDone}>
      <Pressable style={styles.rejectScrim} onPress={onDone}>
        <Animated.View
          style={[
            styles.rejectCard,
            {
              marginBottom: insets.bottom + 16,
              opacity: slide,
              transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [220, 0] }) }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.thumb,
              { transform: [{ rotate: wave.interpolate({ inputRange: [-1, 1], outputRange: ['-18deg', '18deg'] }) }] },
            ]}
          >
            <Ionicons name="thumbs-up" size={30} color={AppColors.white} />
          </Animated.View>
          <View style={styles.rejectText}>
            <Text style={styles.rejectTitle}>{Strings.rejectedCheerTitle}</Text>
            <Text style={styles.rejectBody}>{Strings.rejectedCheerBody}</Text>
            <Text style={styles.rejectHint}>{Strings.rejectedCheerHint}</Text>
          </View>
          <Pressable onPress={onDone} style={styles.rejectButton} hitSlop={10}>
            <Text style={styles.rejectButtonText}>{Strings.rejectedCheerAction}</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'space-between', paddingTop: 80, paddingBottom: 48 },
  center: { alignItems: 'center', paddingHorizontal: 24, marginTop: 40 },
  badgeWrap: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FFD54A',
  },
  badge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: AppColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#FFD54A',
  },
  acceptedTitle: { ...Typography.h2.extraBold, color: AppColors.white, textAlign: 'center' },
  acceptedBody: {
    ...Typography.body1.medium,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    marginTop: 8,
  },
  earningChip: {
    alignItems: 'center',
    marginTop: 22,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  earningChipLabel: { ...Typography.body2.bold, color: '#FFD54A', letterSpacing: 1 },
  earningChipAmount: { ...Typography.h1.extraBold, color: AppColors.white, marginTop: 2 },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  routeText: { ...Typography.body2.bold, color: AppColors.white, marginLeft: 4, flexShrink: 1 },
  routeArrow: { marginHorizontal: 8 },
  brand: { ...Typography.body2.semiBold, color: 'rgba(255,255,255,0.8)', marginTop: 22 },
  goButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 34,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: AppColors.white,
  },
  goText: { ...Typography.button2.extraBold, color: AppColors.primary, marginRight: 8 },

  rejectScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)' },
  rejectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: AppColors.white,
    borderLeftWidth: 5,
    borderLeftColor: '#FF9F43',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FF9F43',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: { flex: 1, marginLeft: 12 },
  rejectTitle: { ...Typography.body1.extraBold, color: AppColors.text },
  rejectBody: { ...Typography.body2.medium, color: AppColors.text, marginTop: 2 },
  rejectHint: { ...Typography.body2.bold, color: AppColors.success500, marginTop: 4 },
  rejectButton: { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 8 },
  rejectButtonText: { ...Typography.button2.extraBold, color: AppColors.primary },
});
