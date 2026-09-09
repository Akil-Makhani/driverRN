/**
 * Broadcast job offers — the dispatch half of the Porter-style flow.
 *
 * The assigned-trip model in `trip.ts` answers "what am I already carrying".
 * This one answers "what is being offered to every on-duty driver right now",
 * and the two are deliberately separate types: an offer has no driver yet, may
 * be withdrawn a second after it arrives, and carries the money/distance a
 * driver needs in order to say yes — none of which a TripItem models.
 *
 * An offer becomes a TripItem the moment this driver wins the race for it.
 */
import { Envelope, list, num, str } from './api';
import { type Address, parseAddress } from './trip';

/** Why an offer left the queue. Drives the one-line banner after it goes. */
export type JobOutcome =
  /** Another driver accepted first. */
  | 'taken'
  /** The countdown ran out with no answer from this driver. */
  | 'expired'
  /** The customer or admin cancelled the order while it was on offer. */
  | 'cancelled'
  /** This driver declined it. */
  | 'declined'
  /** The accept call itself failed (network, server). */
  | 'failed';

/** Which module the offer came from. Tempo orders carry a real fare and distance. */
export type JobOrderKind = 'truck' | 'tempo';

export interface JobOffer {
  /**
   * The offer id, and what accept/reject address. Deliberately NOT the trip
   * id: the trip only exists once someone wins, and addressing the offer is
   * what lets the server settle the race in one atomic write.
   */
  id: string;
  /** Present once this driver has won; the trip to open. */
  tripId?: string;
  orderId?: string;
  subOrderId?: string;

  pickupAddress?: Address;
  deliveryAddress?: Address;

  /** Road distance pickup → drop, in km, as the server computed it. */
  distanceKm?: number;
  /** Driving time pickup → drop, in minutes. Traffic-aware where available. */
  durationMin?: number;
  /**
   * The pickup → drop road shape, as an encoded polyline.
   *
   * Sent with the offer rather than fetched here: the card lives for about
   * thirty seconds, and a routing round trip from the phone would often not
   * land in time. Absent when the server could not route it, which this reads
   * as "draw a straight line between the pins".
   */
  routePolyline?: string;
  /** Road distance from this driver to the pickup, in km. */
  pickupDistanceKm?: number;
  /** Driving time from this driver to the pickup, in minutes. */
  pickupDurationMin?: number;
  totalWeight?: number;
  orderKind?: JobOrderKind;
  /** What the driver earns, in rupees. Only set when the server knows it. */
  payout?: number;
  /**
   * The order's own fare, in rupees — what the customer is billed.
   *
   * Deliberately separate from `payout`, and labelled as the fare on the card,
   * because they are not the same number and a driver deciding in thirty
   * seconds must not read one as the other.
   */
  fareAmount?: number;
  /** One line of "what am I carrying", e.g. "Cement · 40 bags". */
  productSummary?: string;

  /** ISO instant after which the server refuses an accept. */
  expiresAt?: string;
  /** How long the offer was live for, in seconds, as sent. */
  ttlSeconds?: number;
  createdAt?: string;
}

export const parseJobOffer = (j: any): JobOffer => ({
  id: str(j?._id) ?? str(j?.id) ?? '',
  tripId: str(j?.tripId),
  orderId: str(j?.orderId),
  subOrderId: str(j?.subOrderId),
  pickupAddress: j?.pickupAddress ? parseAddress(j.pickupAddress) : undefined,
  deliveryAddress: j?.deliveryAddress ? parseAddress(j.deliveryAddress) : undefined,
  distanceKm: num(j?.distanceKm),
  durationMin: num(j?.durationMin),
  routePolyline: str(j?.routePolyline),
  pickupDistanceKm: num(j?.pickupDistanceKm),
  pickupDurationMin: num(j?.pickupDurationMin),
  totalWeight: num(j?.totalWeight),
  orderKind: (str(j?.orderKind) as JobOrderKind | undefined) ?? 'truck',
  payout: num(j?.payout),
  fareAmount: num(j?.fareAmount),
  productSummary: str(j?.productSummary),
  expiresAt: str(j?.expiresAt),
  ttlSeconds: num(j?.ttlSeconds),
  createdAt: str(j?.createdAt),
});

export type JobOfferListResponse = Envelope<JobOffer[]>;

export const parseJobOfferListResponse = (j: any): JobOfferListResponse => ({
  status: j?.status,
  message: j?.message,
  data: j?.data ? list(j.data, parseJobOffer) : null,
});

/** The accept endpoint answers with the trip the driver just won. */
export type JobAcceptResponse = Envelope<{ tripId?: string; jobId?: string }>;

export const parseJobAcceptResponse = (j: any): JobAcceptResponse => ({
  status: j?.status,
  message: j?.message,
  data: j?.data
    ? { tripId: str(j.data.tripId) ?? str(j.data._id), jobId: str(j.data.jobId) }
    : null,
});

/** Default countdown when the server sends neither `expiresAt` nor `ttlSeconds`. */
export const DEFAULT_OFFER_TTL_SECONDS = 30;

/**
 * Seconds left on an offer's countdown.
 *
 * Both inputs are unreliable on their own, in opposite directions. `expiresAt`
 * is absolute, so a phone with a skewed clock reads it as already-expired (or
 * as good for an hour). `ttlSeconds` counted from arrival ignores the delivery
 * delay, so a push that sat in Doze for ten seconds gets a full countdown the
 * server will not honour.
 *
 * So: trust `expiresAt` while it lands inside the window the TTL allows, and
 * fall back to the TTL when it does not. Either way this is only the UI clock —
 * the server rejects a late accept regardless of what the phone believed.
 */
export function remainingSeconds(offer: JobOffer, now = Date.now()): number {
  const ttl = offer.ttlSeconds ?? DEFAULT_OFFER_TTL_SECONDS;

  if (offer.expiresAt) {
    const parsed = Date.parse(offer.expiresAt);
    if (Number.isFinite(parsed)) {
      const left = (parsed - now) / 1000;
      if (left > 0 && left <= ttl) return left;
    }
  }
  return ttl;
}
