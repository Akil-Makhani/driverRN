/**
 * The pieces the Trip History and Cancelled Trips lists share: a card per
 * trip, a day heading above each new day, and the empty state.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { TripStatusNumber } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { formatKm, formatRupees } from '@/core/utils/number-format';
import type { RejectedJob, TripDoc } from '@/types/history';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface StatusLook {
  label: string;
  icon: IconName;
  color: string;
  background: string;
}

const AMBER = '#B54708';
const AMBER_BG = '#FFFAEB';

/**
 * The trip's stage in the app's language. The server's `state.label` is
 * English, so it is only the fallback for a stage the app has no copy for.
 */
function statusLook(trip: TripDoc, cancelled: boolean): StatusLook {
  if (cancelled) {
    return {
      label: Strings.statusCancelled,
      icon: 'close-circle-outline',
      color: AppColors.error600,
      background: '#FEF3F2',
    };
  }
  switch (trip.statusNumber) {
    case TripStatusNumber.delivered:
      return {
        label: Strings.statusComplete,
        icon: 'check-circle-outline',
        color: AppColors.success500,
        background: AppColors.success50,
      };
    case TripStatusNumber.inTransit:
      return {
        label: Strings.statusInTransit,
        icon: 'truck-fast-outline',
        color: AMBER,
        background: AMBER_BG,
      };
    case TripStatusNumber.pickup:
      return {
        label: Strings.statusPickup,
        icon: 'package-variant',
        color: AMBER,
        background: AMBER_BG,
      };
    case TripStatusNumber.accepted:
      return {
        label: Strings.statusAccept,
        icon: 'truck-outline',
        color: AppColors.primary,
        background: Primary.c100,
      };
    default:
      return {
        label: trip.state?.label ?? '',
        icon: 'truck-outline',
        color: AppColors.primary,
        background: Primary.c100,
      };
  }
}

/** "7:05 PM" — the day is already in the heading above the card. */
export function timeOf(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** "Today", "Yesterday", or "3 Feb 2026" in the device's zone. */
export function dayLabel(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return Strings.today;
  if (dayKey(d) === dayKey(yesterday)) return Strings.yesterday;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** The heading to draw above `index`, or undefined when it shares the previous item's day. */
export function headingFor<T>(
  items: T[],
  index: number,
  isoOf: (item: T) => string | undefined = (item) => (item as TripDoc)?.updatedAtIso,
): string | undefined {
  const label = dayLabel(isoOf(items[index]));
  if (index === 0) return label;
  return label === dayLabel(isoOf(items[index - 1])) ? undefined : label;
}

export function DayHeading({ label }: { label: string }) {
  return <Text style={styles.dayHeading}>{label}</Text>;
}

export function TripCard({
  trip,
  cancelled = false,
  onPress,
}: {
  trip: TripDoc;
  cancelled?: boolean;
  onPress: () => void;
}) {
  const look = statusLook(trip, cancelled);
  const time = timeOf(trip.updatedAtIso) ?? trip.updatedAt;
  const weight = trip.totalWeight ? `${formatRupees(trip.totalWeight)} ${Strings.kg}` : undefined;

  // A cancelled trip pays nothing, so its offered fare would only mislead.
  const earning = !cancelled && trip.driverPayout != null ? trip.driverPayout : undefined;
  const delivered = trip.statusNumber === TripStatusNumber.delivered;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: look.color },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: look.background }]}>
          <MaterialCommunityIcons name={look.icon} size={22} color={look.color} />
        </View>
        <View style={styles.titleColumn}>
          <Text style={styles.tripNumber}>
            {`${Strings.trip} #${trip.driverTripNumber ?? ''}`}
          </Text>
          {time ? (
            <View style={styles.meta}>
              <MaterialCommunityIcons name="clock-outline" size={13} color={TextShade.c600} />
              <Text style={styles.metaText}>{time}</Text>
            </View>
          ) : null}
        </View>
        {earning != null ? (
          <View style={styles.earning}>
            <Text style={styles.earningLabel}>{Strings.tripEarning}</Text>
            <Text
              style={[
                styles.earningAmount,
                { color: delivered ? AppColors.success500 : AppColors.primary },
              ]}
            >
              {`${Strings.rupeesSign}${formatRupees(earning)}`}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.addressRow}>
        <MaterialCommunityIcons name="map-marker" size={18} color={AppColors.primary} />
        <Text style={styles.address} numberOfLines={2}>
          {trip.pickupAddress ?? ''}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        {weight ? (
          <View style={styles.meta}>
            <MaterialCommunityIcons name="weight-kilogram" size={15} color={TextShade.c600} />
            <Text style={styles.metaText}>{weight}</Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.bottomRight}>
          <View style={[styles.pill, { backgroundColor: look.background }]}>
            <MaterialCommunityIcons name={look.icon} size={13} color={look.color} />
            <Text style={[styles.pillText, { color: look.color }]}>{look.label}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={TextShade.c400} />
        </View>
      </View>
    </Pressable>
  );
}

const GREY = TextShade.c600;
const GREY_BG = TextShade.c100;

/** Where an offer went from or to: the company, then its city. */
function placeOf(company?: string, city?: string): string {
  return [company, city].filter(Boolean).join(', ');
}

/** An offer the driver declined. Not tappable: no trip was ever made from it. */
export function RejectedCard({ job }: { job: RejectedJob }) {
  const time = timeOf(job.rejectedAtIso);
  const weight = job.totalWeight ? `${formatRupees(job.totalWeight)} ${Strings.kg}` : undefined;
  const km = job.distanceKm ? `${formatKm(job.distanceKm)} km` : undefined;
  const from = placeOf(job.pickupAddress, job.pickupCity);
  const to = placeOf(job.deliveryAddress, job.deliveryCity);

  return (
    <View style={[styles.card, { borderLeftColor: GREY }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: GREY_BG }]}>
          <MaterialCommunityIcons name="hand-back-left-outline" size={22} color={GREY} />
        </View>
        <View style={styles.titleColumn}>
          <View style={[styles.pill, styles.pillStart, { backgroundColor: GREY_BG }]}>
            <MaterialCommunityIcons name="close" size={13} color={GREY} />
            <Text style={[styles.pillText, { color: GREY }]}>{Strings.tabRejected}</Text>
          </View>
          {time ? (
            <View style={styles.meta}>
              <MaterialCommunityIcons name="clock-outline" size={13} color={TextShade.c600} />
              <Text style={styles.metaText}>{time}</Text>
            </View>
          ) : null}
        </View>
        {job.payout != null ? (
          <View style={styles.earning}>
            <Text style={styles.earningLabel}>{Strings.rejectedOffer}</Text>
            <Text style={[styles.earningAmount, { color: TextShade.c700 }]}>
              {`${Strings.rupeesSign}${formatRupees(job.payout)}`}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.route}>
        <View style={styles.routeRail}>
          <View style={[styles.dot, { backgroundColor: AppColors.success500 }]} />
          {to ? <View style={styles.railLine} /> : null}
          {to ? <View style={[styles.dot, { backgroundColor: AppColors.error500 }]} /> : null}
        </View>
        <View style={styles.routeText}>
          <Text style={styles.routeAddress} numberOfLines={1}>{from}</Text>
          {to ? (
            <Text style={[styles.routeAddress, styles.routeTo]} numberOfLines={1}>{to}</Text>
          ) : null}
        </View>
      </View>

      {km || weight ? (
        <View style={styles.bottomRow}>
          <View style={styles.bottomRight}>
            {km ? (
              <View style={[styles.meta, styles.metaGap]}>
                <MaterialCommunityIcons name="map-marker-distance" size={15} color={TextShade.c600} />
                <Text style={styles.metaText}>{km}</Text>
              </View>
            ) : null}
            {weight ? (
              <View style={styles.meta}>
                <MaterialCommunityIcons name="weight-kilogram" size={15} color={TextShade.c600} />
                <Text style={styles.metaText}>{weight}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function EmptyTrips({ icon, message }: { icon: IconName; message: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyCircle}>
        <MaterialCommunityIcons name={icon} size={44} color={AppColors.primary} />
      </View>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dayHeading: {
    ...Typography.caption.extraBold,
    color: TextShade.c600,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: AppColors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TextShade.c100,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardPressed: { backgroundColor: AppColors.secondary100 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleColumn: { flex: 1 },
  tripNumber: { ...Typography.subtitle2.extraBold, color: AppColors.text },
  earning: { alignItems: 'flex-end', marginLeft: 8 },
  earningLabel: { ...Typography.overline2.regular, color: TextShade.c600, letterSpacing: 0.3 },
  earningAmount: { ...Typography.subtitle1.extraBold },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TextShade.c200,
  },
  address: {
    ...Typography.body1.semiBold,
    color: TextShade.c900,
    flex: 1,
    marginLeft: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  bottomRight: { flexDirection: 'row', alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 2,
  },
  pillText: { ...Typography.caption.extraBold, marginLeft: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  metaGap: { marginRight: 16 },
  pillStart: { alignSelf: 'flex-start', marginBottom: 2 },
  route: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TextShade.c200,
  },
  routeRail: { alignItems: 'center', width: 14, paddingTop: 7, marginRight: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  railLine: { width: 2, flex: 1, minHeight: 14, backgroundColor: TextShade.c200, marginVertical: 3 },
  routeText: { flex: 1 },
  routeAddress: { ...Typography.body1.semiBold, color: TextShade.c900 },
  routeTo: { marginTop: 6 },
  metaText: { ...Typography.caption.regular, color: TextShade.c600, marginLeft: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Primary.c100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: { ...Typography.body1.regular, color: TextShade.c700, textAlign: 'center' },
});
