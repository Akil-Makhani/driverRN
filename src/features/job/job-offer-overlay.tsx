/**
 * The full-screen incoming-order alert.
 *
 * Mounted once at the root rather than on a screen, because an offer has to
 * interrupt whatever the driver is doing — reading a trip, editing a load,
 * sitting on the profile page. Routing to a dedicated screen instead would put
 * the offer behind the current screen's navigation state and lose it on a
 * back gesture.
 *
 * The design brief is a driver holding a phone in a truck cab, deciding in
 * under thirty seconds. So the card answers, in order: what does it pay, how
 * far away is it, where does it go, and how long will it take — with the route
 * drawn so the shape of the job is readable before any of the words are. The
 * two targets sit far enough apart that neither is hit by accident, and
 * everything secondary is a chip.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionConfirmDialog } from '@/components/action-confirm-dialog';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { addressSubtitle, addressTitle } from '@/core/utils/maps';
import { formatKm, formatMinutes, formatRupees } from '@/core/utils/number-format';
import { decodePolyline, regionForPoints } from '@/core/utils/polyline';
import { useJobStore } from '@/features/job/job-store';
import { DEFAULT_OFFER_TTL_SECONDS, type JobOffer, type JobOutcome } from '@/types/job';
import type { Address } from '@/types/trip';

/**
 * Addresses carry coordinates as numbers or strings depending on which module
 * the order came from, and the API is loose about sending "0" for "unknown".
 * Anything that does not parse to a usable pair is treated as no coordinate,
 * rather than dropping a pin at 0°N 0°E in the Atlantic.
 */
function coordinateOf(
  address?: Address | null,
): { latitude: number; longitude: number } | null {
  const latitude = Number(address?.latitude);
  const longitude = Number(address?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

/**
 * The lead line on a stop: "21 mins (6.6 km)".
 *
 * Time first because that is what a driver actually decides on; distance in
 * brackets for the ones who think in kilometres. Returns an empty string when
 * neither is known, and the row falls back to a plain PICKUP / DROP label.
 */
function legLabel(durationMin?: number, distanceKm?: number): string {
  const time = formatMinutes(durationMin);
  const distance = distanceKm != null ? `${formatKm(distanceKm)} km` : '';
  if (time && distance) return `${time} (${distance})`;
  return time || distance;
}

/** Below this fraction of the countdown the bar turns amber, then red. */
const WARN_AT = 0.5;
const URGENT_AT = 0.25;

const NOTICE_TEXT: Record<JobOutcome, string> = {
  taken: Strings.offerTaken,
  expired: Strings.offerExpiredNotice,
  cancelled: Strings.offerCancelledNotice,
  failed: Strings.offerFailedNotice,
  // A decline is the driver's own doing; it needs no explanation back to them.
  declined: '',
};

export function JobOfferOverlay() {
  // The sheet sits on the bottom edge, which on most phones is where the
  // gesture bar or nav buttons live. Without this the ACCEPT button ends up
  // underneath them — reachable only by a tap the system swallows.
  const insets = useSafeAreaInsets();
  // The first offer the driver has NOT pushed aside. A minimised one stays
  // live on the dashboard strip; it just stops taking the screen.
  const offer = useJobStore((s) => s.offers.find((o) => !s.minimisedIds.includes(o.id)));
  const deadline = useJobStore((s) => {
    const next = s.offers.find((o) => !s.minimisedIds.includes(o.id));
    return next ? s.deadlines[next.id] : undefined;
  });
  const acceptingId = useJobStore((s) => s.acceptingId);
  const notice = useJobStore((s) => s.notice);

  /**
   * The answer waiting on "Are you sure?", tied to the offer it was asked about.
   * Accepting sends the driver across town and rejecting loses the job for
   * good, so neither goes on a single tap. The countdown and the siren carry on
   * underneath: the dialog is a second look, not a pause. If this offer is
   * taken, expires or is replaced while it is open, the id no longer matches
   * and the question quietly goes away with it.
   */
  const [decision, setDecision] = useState<{ kind: OfferDecision; offerId: string } | null>(null);
  /** Kept through the dialog's fade-out, so its colour does not flip on close. */
  const lastDecision = useRef<OfferDecision>('accept');
  if (decision) lastDecision.current = decision.kind;

  const [secondsLeft, setSecondsLeft] = useState(0);
  // Driven natively so the bar stays smooth while the accept request and a
  // dashboard refetch are both running on the JS thread.
  const progress = useRef(new Animated.Value(1)).current;

  const ttlSeconds = offer?.ttlSeconds ?? DEFAULT_OFFER_TTL_SECONDS;

  useEffect(() => {
    if (!offer || !deadline) return;

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      useJobStore.getState().expire(offer.id);
      return;
    }

    // Start the bar at the fraction actually left, not at full: an offer
    // recovered by the resync is already part-way through its window.
    progress.setValue(Math.min(1, remainingMs / (ttlSeconds * 1000)));
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: remainingMs,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();

    setSecondsLeft(Math.ceil(remainingMs / 1000));
    // 250ms rather than 1s so the number never appears to skip a beat when a
    // tick lands just after a second boundary.
    const ticker = setInterval(() => {
      const left = deadline - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0) useJobStore.getState().expire(offer.id);
    }, 250);

    return () => {
      animation.stop();
      clearInterval(ticker);
    };
  }, [offer, deadline, ttlSeconds, progress]);

  const noticeText = notice ? NOTICE_TEXT[notice.outcome] : '';
  // The notice only gets the screen once the offer it describes has gone;
  // a queued offer always outranks a postmortem of the previous one.
  const showNotice = !offer && Boolean(noticeText);

  if (!offer && !showNotice) return null;

  const isAccepting = offer != null && acceptingId === offer.id;

  /**
   * Money first when there is any, and never unlabelled — `payout` is what the
   * driver keeps, `fareAmount` is what the customer pays, and they are only
   * interchangeable to someone who is not driving the truck. Falls back to the
   * load so the card always leads with something real.
   */
  const headline = !offer
    ? null
    : offer.payout != null
      ? { value: `${Strings.rupeesSign}${formatRupees(offer.payout)}`, label: Strings.offerYouEarn }
      : offer.fareAmount != null
        ? { value: `${Strings.rupeesSign}${formatRupees(offer.fareAmount)}`, label: Strings.offerFare }
        : offer.totalWeight != null
          ? { value: `${Math.trunc(offer.totalWeight)} ${Strings.kg}`, label: Strings.offerLoad }
          : null;
  // The route to draw. Falls back to a straight line between the pins when the
  // server could not route it, which is better than an empty map.
  const routePoints = offer?.routePolyline ? decodePolyline(offer.routePolyline) : [];
  const pickupPoint = coordinateOf(offer?.pickupAddress);
  const dropPoint = coordinateOf(offer?.deliveryAddress);
  const linePoints = routePoints.length
    ? routePoints
    : pickupPoint && dropPoint
      ? [pickupPoint, dropPoint]
      : [];
  const mapRegion = regionForPoints(
    linePoints.length ? linePoints : [pickupPoint, dropPoint].filter(Boolean) as any[],
  );

  const fraction = ttlSeconds > 0 ? secondsLeft / ttlSeconds : 0;
  const barColor =
    fraction <= URGENT_AT
      ? AppColors.error500
      : fraction <= WARN_AT
        ? '#F79009'
        : AppColors.success500;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      // Android's back gesture must not answer an offer. Declining is a
      // deliberate tap; anything else lets the countdown decide.
      onRequestClose={() => {}}
    >
      <View style={styles.scrim}>
        {/* Declared before the card so it sits behind it: a tap anywhere the
            card does not cover pushes the offer aside without answering it.
            Not a decline — the countdown keeps running and it reappears on the
            dashboard, because a driver mid-turn should be able to look away
            without losing the job. */}
        {offer && (
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel={Strings.offerMinimise}
            onPress={() => useJobStore.getState().minimise(offer.id)}
          />
        )}

        {showNotice ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{noticeText}</Text>
          </View>
        ) : offer ? (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{Strings.newOrderTitle}</Text>
              <View style={styles.timerPill}>
                <Text style={styles.timerText}>
                  {`${secondsLeft}${Strings.offerSeconds}`}
                </Text>
              </View>
            </View>

            <View style={styles.track}>
              <Animated.View
                style={[
                  styles.trackFill,
                  { backgroundColor: barColor, transform: [{ scaleX: progress }] },
                ]}
              />
            </View>

            {/* The job's shape, before any of the words. Rendered only when
                there is something real to draw — an empty grey rectangle is
                worse than no map, and costs the driver vertical space they
                need for the addresses. */}
            {mapRegion && (
              <View style={styles.mapFrame}>
                <MapView
                  style={StyleSheet.absoluteFill}
                  provider={PROVIDER_GOOGLE}
                  initialRegion={mapRegion}
                  /*
                   * Pan and zoom are on so the driver can actually look at
                   * where the job is — whether the pickup is the yard they
                   * know, which side of town the drop is on. Deliberately NOT
                   * liteMode, which renders a flat image and cannot be touched
                   * at all.
                   *
                   * Rotate and pitch stay off: they are easy to trigger by
                   * accident with two thumbs on a small map and leave it at an
                   * angle the driver then has to fix, with the clock running.
                   */
                  scrollEnabled
                  zoomEnabled
                  rotateEnabled={false}
                  pitchEnabled={false}
                  // The Google toolbar throws up its own overlay buttons on
                  // marker tap, which would sit on top of a card that already
                  // has the only two buttons that matter.
                  toolbarEnabled={false}
                  // Tapping a marker should show its label, not re-centre the
                  // map out from under the driver's finger.
                  moveOnMarkerPress={false}
                >
                  {linePoints.length > 1 && (
                    <>
                      {/* A white casing under the route, so the line reads on
                          both pale roads and dark green map areas. */}
                      <Polyline
                        coordinates={linePoints}
                        strokeColor="#FFFFFF"
                        strokeWidth={8}
                      />
                      <Polyline
                        coordinates={linePoints}
                        strokeColor={AppColors.primary}
                        strokeWidth={4}
                      />
                    </>
                  )}
                  {pickupPoint && (
                    <Marker
                      coordinate={pickupPoint}
                      // Tap shows the company and where it is — the whole
                      // reason a driver looks at the map before accepting.
                      title={addressTitle(offer.pickupAddress) || Strings.offerPickup}
                      description={addressSubtitle(offer.pickupAddress)}
                      anchor={{ x: 0.5, y: 0.5 }}
                      tracksViewChanges={false}
                    >
                      {/* Small dots rather than the default teardrops, which at
                          this size cover the roads either side of the stop. */}
                      <View style={[styles.pin, styles.pinPickup]} />
                    </Marker>
                  )}
                  {dropPoint && (
                    <Marker
                      coordinate={dropPoint}
                      title={addressTitle(offer.deliveryAddress) || Strings.offerDrop}
                      description={addressSubtitle(offer.deliveryAddress)}
                      anchor={{ x: 0.5, y: 0.5 }}
                      tracksViewChanges={false}
                    >
                      <View style={[styles.pin, styles.pinDrop]} />
                    </Marker>
                  )}
                </MapView>
              </View>
            )}

            {/* Everything between the map and the buttons scrolls, so a long
                address or a small screen can never push ACCEPT out of reach.
                The map is deliberately outside it — a pan on the map must not
                be stolen by the scroll view. */}
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
            {/* The headline the driver decides on, and a label saying exactly
                what it is. Take-home pay when the server knows it, otherwise
                the order's fare, otherwise the load — a blank hero reads as a
                broken card and an unlabelled "₹1,136" reads as wages. */}
            {headline && (
              <View style={styles.payoutRow}>
                <View style={styles.headlineBlock}>
                  <Text style={styles.payout}>{headline.value}</Text>
                  {Boolean(headline.label) && (
                    <Text style={styles.headlineLabel}>{headline.label}</Text>
                  )}
                </View>
                {offer.totalWeight != null && (
                  <Text style={styles.distance}>
                    {`${Math.trunc(offer.totalWeight)} ${Strings.kg}`}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.timeline}>
              <Stop
                kind="pickup"
                label={Strings.offerPickup}
                lead={legLabel(offer.pickupDurationMin, offer.pickupDistanceKm)}
                title={addressTitle(offer.pickupAddress)}
                subtitle={addressSubtitle(offer.pickupAddress)}
              />
              <View style={styles.timelineLine} />
              <Stop
                kind="drop"
                label={Strings.offerDrop}
                lead={legLabel(offer.durationMin, offer.distanceKm)}
                title={addressTitle(offer.deliveryAddress)}
                subtitle={addressSubtitle(offer.deliveryAddress)}
              />
            </View>

            {Boolean(offer.productSummary) && (
              <View style={styles.chipRow}>
                <Chip text={offer.productSummary!} />
              </View>
            )}

            </ScrollView>

            <View style={[styles.actions, { paddingBottom: 16 + insets.bottom }]}>
              <Pressable
                style={({ pressed }) => [styles.button, styles.rejectButton, pressed && styles.busy]}
                disabled={isAccepting}
                onPress={() => setDecision({ kind: 'reject', offerId: offer.id })}
              >
                <MaterialCommunityIcons name="close-circle-outline" size={20} color={AppColors.primary} />
                <Text style={styles.rejectText}>{Strings.offerReject}</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.acceptButton,
                  (isAccepting || pressed) && styles.busy,
                ]}
                disabled={isAccepting}
                onPress={() => setDecision({ kind: 'accept', offerId: offer.id })}
              >
                {isAccepting ? (
                  <ActivityIndicator color={AppColors.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-circle-outline" size={20} color={AppColors.white} />
                    <Text style={styles.acceptText}>{Strings.offerAccept}</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {offer && (
        <ActionConfirmDialog
          visible={decision != null && decision.offerId === offer.id}
          {...DECISION_CONFIRM[decision?.kind ?? lastDecision.current]}
          badge={`${secondsLeft}${Strings.offerSeconds}`}
          details={[
            headline ? `${headline.label}: ${headline.value}` : '',
            `${Strings.offerPickup}: ${addressTitle(offer.pickupAddress) || '—'}`,
            `${Strings.offerDrop}: ${addressTitle(offer.deliveryAddress) || '—'}`,
          ].filter(Boolean)}
          cancelLabel={Strings.confirmGoBack}
          onCancel={() => setDecision(null)}
          onConfirm={() => {
            const answer = decision;
            setDecision(null);
            if (!answer || answer.offerId !== offer.id) return;
            if (answer.kind === 'accept') void useJobStore.getState().accept(offer.id);
            else void useJobStore.getState().reject(offer.id);
          }}
        />
      )}
    </Modal>
  );
}

type OfferDecision = 'accept' | 'reject';

/**
 * What each answer asks before it goes. Both in the app's own colour, the same
 * as the trip steps' confirmations; the icon and wording tell them apart.
 */
const DECISION_CONFIRM: Record<
  OfferDecision,
  Pick<
    ComponentProps<typeof ActionConfirmDialog>,
    'tone' | 'icon' | 'label' | 'title' | 'message' | 'confirmLabel' | 'confirmIcon'
  >
> = {
  accept: {
    tone: 'primary',
    icon: 'check-decagram',
    label: Strings.confirmAcceptOfferLabel,
    title: Strings.confirmAcceptOfferTitle,
    message: Strings.confirmAcceptOfferBody,
    confirmLabel: Strings.confirmAcceptOfferAction,
    confirmIcon: 'check',
  },
  reject: {
    tone: 'primary',
    icon: 'close-octagon',
    label: Strings.confirmRejectOfferLabel,
    title: Strings.confirmRejectOfferTitle,
    message: Strings.confirmRejectOfferBody,
    confirmLabel: Strings.confirmRejectOfferAction,
    confirmIcon: 'close',
  },
};

function Stop({
  kind,
  label,
  lead,
  title,
  subtitle,
}: {
  kind: 'pickup' | 'drop';
  /** Fallback when no time or distance is known for this leg. */
  label: string;
  /** "21 mins (6.6 km)" — the line the driver reads first. */
  lead: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.stopRow}>
      <View
        style={[styles.dot, kind === 'pickup' ? styles.dotPickup : styles.dotDrop]}
      />
      <View style={styles.stopBody}>
        {lead ? (
          <Text style={styles.stopLead}>{lead}</Text>
        ) : (
          <Text style={styles.stopLabel}>{label}</Text>
        )}
        <Text style={styles.stopTitle} numberOfLines={1}>
          {title}
        </Text>
        {Boolean(subtitle) && (
          <Text style={styles.stopSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const Chip = ({ text }: { text: string }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText} numberOfLines={1}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    // Anchored to the bottom like a ride-hailing offer sheet: the map gets the
    // room it needs, and the two buttons land under the driver's thumb rather
    // than in the middle of the screen.
    justifyContent: 'flex-end',
  },

  card: {
    width: '100%',
    backgroundColor: AppColors.white,
    // Rounded at the top only — it rises from the bottom edge.
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    // A ceiling, so the sheet can never grow past the top of the screen and
    // take the header with it. Anything that does not fit scrolls in `body`.
    maxHeight: '92%',
  },

  // The scrolling middle. flexShrink lets it give up space to the map and the
  // buttons, which are the two parts that must never be cut off.
  body: { flexShrink: 1 },
  bodyContent: { paddingBottom: 4 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { ...Typography.subtitle2.extraBold, color: AppColors.white },
  timerPill: {
    minWidth: 46,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  timerText: { ...Typography.button2.extraBold, color: AppColors.white },

  track: { height: 4, backgroundColor: Primary.c100 },
  // Anchored left so the bar drains towards the origin instead of shrinking
  // towards its centre from both ends.
  trackFill: { height: 4, width: '100%', transformOrigin: 'left' },

  // Map markers: a filled dot with a white ring, small enough to sit on the
  // stop rather than blanket the streets around it.
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: AppColors.white,
  },
  pinPickup: { backgroundColor: AppColors.success500 },
  pinDrop: { backgroundColor: AppColors.error500 },

  mapFrame: {
    /*
     * Taller than a preview would need, because this one is pinched and
     * dragged: at 160 there was not enough room to zoom into a pickup without
     * losing the rest of the route off the edges.
     *
     * Capped against the screen so it cannot grow the sheet past the bottom of
     * a short phone — the addresses and the two buttons matter more than the
     * map, and on a fixed 260 they were the ones that would have been pushed
     * off the top.
     */
    height: Math.min(260, Math.round(Dimensions.get('window').height * 0.3)),
    backgroundColor: Primary.c100,
    borderBottomWidth: 1,
    borderBottomColor: Primary.c200,
  },

  payoutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headlineBlock: { flexShrink: 1 },
  headlineLabel: {
    ...Typography.overline2.bold,
    color: TextShade.c500,
    marginTop: 2,
  },
  payout: { ...Typography.h2.extraBold, color: AppColors.text },
  distance: { ...Typography.body2.semiBold, color: TextShade.c600, marginTop: 8 },

  timeline: { paddingHorizontal: 16, paddingTop: 14 },
  stopRow: { flexDirection: 'row' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, marginRight: 12 },
  dotPickup: { backgroundColor: AppColors.success500 },
  dotDrop: { backgroundColor: AppColors.error500 },
  // Bridges the two dots. Offset to sit under the dot centres, and inset so it
  // stops short of both rather than running through them.
  timelineLine: {
    width: 2,
    height: 14,
    marginLeft: 5,
    marginVertical: 2,
    backgroundColor: Primary.c200,
  },
  stopBody: { flex: 1 },
  stopLabel: { ...Typography.overline2.bold, color: TextShade.c500 },
  // The leg's time and distance. Sized above the address on purpose — it is
  // what the decision turns on, and the address only matters once made.
  stopLead: { ...Typography.body2.extraBold, color: AppColors.primary },
  stopTitle: { ...Typography.body1.bold, color: AppColors.text, marginTop: 2 },
  stopSubtitle: { ...Typography.body2.regular, color: TextShade.c600, marginTop: 1 },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: AppColors.secondary100,
  },
  chipText: { ...Typography.caption.semiBold, color: AppColors.primary },

  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    // paddingBottom is set inline from the safe-area inset — on a gesture-bar
    // phone a flat 16 leaves ACCEPT underneath the system bar.
    borderTopWidth: 1,
    borderTopColor: Primary.c100,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  // Both in the app's own colour, matching the trip screen's buttons: outlined
  // REJECT, solid ACCEPT, so the solid one is where the eye lands first.
  rejectButton: { borderWidth: 1.5, borderColor: AppColors.primary, backgroundColor: Primary.c100 },
  rejectText: { ...Typography.button1.bold, color: AppColors.primary },
  // Accept is weighted heavier than reject on purpose: it is the action the
  // driver came for, and the one they need to hit without looking.
  acceptButton: { flex: 1.4, backgroundColor: AppColors.primary },
  acceptText: { ...Typography.button1.extraBold, color: AppColors.white },
  busy: { opacity: 0.75 },

  noticeCard: {
    alignSelf: 'center',
    marginBottom: '60%',
    marginHorizontal: 24,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: AppColors.white,
  },
  noticeText: { ...Typography.body1.semiBold, color: AppColors.text, textAlign: 'center' },
});
