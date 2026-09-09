/**
 * The offers the driver pushed aside, waiting on the dashboard.
 *
 * Tapping outside the offer card does not answer it — the countdown keeps
 * running server-side either way, so throwing the offer away would cost the
 * driver a job for the crime of looking away at a junction. It lands here
 * instead, and one tap brings it back.
 *
 * Rendered as a full dashboard card rather than the small chip this used to
 * be. The chip was easy to miss and easy to mistake for a badge, while the
 * thing it stands for is a whole order with about a minute left on it. It now
 * uses the same shape the accepted trips below it use — weight pill, address,
 * two labelled columns, a full-width bar at the foot — so a waiting offer
 * reads as an order in the list, not as decoration above it. The one thing the
 * trip card has no equivalent of is the countdown, which takes the place of
 * the "Trip in process / Accepted" status line.
 *
 * Renders nothing when there is nothing pending, so the dashboard is unchanged
 * for a driver who never dismisses anything.
 */
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { addressTitle } from '@/core/utils/maps';
import { formatRupees } from '@/core/utils/number-format';
import { useJobStore } from '@/features/job/job-store';

export function PendingOffersStrip() {
  const offers = useJobStore((s) => s.offers);
  const minimisedIds = useJobStore((s) => s.minimisedIds);
  const deadlines = useJobStore((s) => s.deadlines);

  // Re-render once a second so the countdowns move. Cheap: this component only
  // exists while something is actually pending.
  const [, tick] = useState(0);
  const pending = offers.filter((o) => minimisedIds.includes(o.id));

  useEffect(() => {
    if (!pending.length) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [pending.length]);

  if (!pending.length) return null;

  return (
    <View>
      <Text style={styles.heading}>
        {`${Strings.offerPending} (${pending.length})`}
      </Text>

      {pending.map((offer) => {
        const secondsLeft = Math.max(
          0,
          Math.ceil(((deadlines[offer.id] ?? 0) - Date.now()) / 1000),
        );
        const pickup =
          addressTitle(offer.pickupAddress) || offer.pickupAddress?.city || '';
        const drop =
          addressTitle(offer.deliveryAddress) || offer.deliveryAddress?.city || '';

        return (
          <Pressable
            key={offer.id}
            onPress={() => useJobStore.getState().restore(offer.id)}
            accessibilityRole="button"
          >
            <View style={styles.spacer} />
            <View style={styles.divider} />
            <View style={styles.body}>
              <View style={styles.topRow}>
                <View style={styles.weightPill}>
                  <Text style={styles.weightText}>
                    {`${Math.trunc(offer.totalWeight ?? 0)}${Strings.kg}`}
                  </Text>
                </View>
                <View style={styles.fare}>
                  <Image source={Images.truck} style={styles.truckIcon} />
                  {offer.fareAmount != null && (
                    <Text style={styles.fareText}>
                      {`${Strings.rupeesSign}${formatRupees(offer.fareAmount)}`}
                    </Text>
                  )}
                </View>
              </View>

              <Text style={styles.address} numberOfLines={1}>
                {pickup}
              </Text>

              <View style={styles.numbersRow}>
                <View style={styles.numberBlock}>
                  <Text style={styles.numberLabel}>{Strings.offerPickup}</Text>
                  <Text style={styles.numberValue} numberOfLines={1}>
                    {offer.pickupAddress?.city ?? ''}
                  </Text>
                </View>
                <View style={[styles.numberBlock, styles.numberBlockSpaced]}>
                  <Text style={styles.numberLabel}>{Strings.offerDrop}</Text>
                  <Text style={styles.numberValue} numberOfLines={1}>
                    {drop}
                  </Text>
                </View>
              </View>

              {/* Where the trip card carries "Trip in process / Accepted".
                  Under ten seconds the timer turns red — at that point the
                  driver is choosing between opening it and losing it. */}
              <View style={styles.actionBar}>
                <Text style={styles.actionLabel}>{Strings.offerTapToOpen}</Text>
                <Text
                  style={[
                    styles.timer,
                    secondsLeft <= 10 && styles.timerUrgent,
                  ]}
                >
                  {`${secondsLeft}${Strings.offerSeconds}`}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// Deliberately the same numbers as dashboard-cell.tsx: a waiting offer and an
// accepted trip must sit in one list without a seam between them.
const styles = StyleSheet.create({
  heading: {
    ...Typography.overline2.bold,
    color: TextShade.c500,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  spacer: { height: 10 },
  divider: { height: 10, backgroundColor: Primary.c100 },
  body: { paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  weightPill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
  },
  weightText: { ...Typography.body1.extraBold, color: AppColors.white },
  fare: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  truckIcon: { height: 25, width: 34, resizeMode: 'contain' },
  fareText: { ...Typography.body1.extraBold, color: AppColors.text, marginLeft: 5 },
  address: { ...Typography.subtitle1.extraBold, color: AppColors.text, marginTop: 5 },
  numbersRow: { flexDirection: 'row', marginTop: 10 },
  numberBlock: { flex: 1, paddingLeft: 3 },
  numberBlockSpaced: { marginLeft: 10 },
  numberLabel: { ...Typography.body2.semiBold, color: TextShade.c700 },
  numberValue: {
    ...Typography.subtitle2.extraBold,
    color: AppColors.text,
    marginTop: 2,
  },
  actionBar: {
    height: 42,
    marginTop: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionLabel: { ...Typography.button2.extraBold, color: AppColors.primary },
  timer: { ...Typography.body1.extraBold, color: AppColors.primary },
  timerUrgent: { color: AppColors.error500 },
});
