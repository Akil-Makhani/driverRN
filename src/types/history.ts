/** Port of lib/screens/trips_history/model/trip_history_model.dart. */
import { Envelope, list, num, str } from './api';
import { formatTimestamp } from '../core/utils/date-format';
import { TripState, parseTripState } from './trip';

export interface TripDoc {
  id?: string;
  subOrderId?: string;
  orderId?: string;
  statusNumber?: number;
  state?: TripState;
  driverTripNumber?: number;
  /** Pre-formatted for display, as Dart did at parse time. */
  updatedAt?: string;
  /** The raw timestamp, so lists can group trips by day. */
  updatedAtIso?: string;
  pickupAddress?: string;
  totalWeight?: number;
  /** What the trip pays the driver; absent on a hand-assigned trip. */
  driverPayout?: number;
}

export const parseTripDoc = (j: any): TripDoc => ({
  id: str(j?._id),
  subOrderId: str(j?.subOrderId),
  orderId: str(j?.orderId),
  statusNumber: num(j?.statusNumber),
  state: j?.state ? parseTripState(j.state) : undefined,
  driverTripNumber: num(j?.driverTripNumber),
  updatedAt: formatTimestamp(j?.updatedAt),
  updatedAtIso: str(j?.updatedAt),
  pickupAddress: str(j?.pickupAddress),
  totalWeight: num(j?.totalWeight),
  driverPayout: num(j?.driverPayout),
});

export interface History {
  docs: TripDoc[];
  total?: number;
  limit?: number;
  pages?: number;
  page?: number;
}

export interface TripHistoryData {
  history?: History;
  completedTripsCount?: number;
}

export type TripHistoryResponse = Envelope<TripHistoryData>;

export const parseTripHistoryResponse = (j: any): TripHistoryResponse => ({
  status: j?.status,
  message: j?.message,
  data: j?.data
    ? {
        history: j.data.history
          ? {
              docs: list(j.data.history.docs, parseTripDoc),
              total: num(j.data.history.total),
              limit: num(j.data.history.limit),
              pages: num(j.data.history.pages),
              page: num(j.data.history.page),
            }
          : undefined,
        completedTripsCount: num(j.data.completedTripsCount),
      }
    : null,
});

/** An offer this driver declined. There is no trip behind it to open. */
export interface RejectedJob {
  id?: string;
  rejectedAtIso?: string;
  pickupAddress?: string;
  pickupCity?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  distanceKm?: number;
  totalWeight?: number;
  /** What it would have paid this driver. */
  payout?: number;
}

export const parseRejectedJob = (j: any): RejectedJob => ({
  id: str(j?._id),
  rejectedAtIso: str(j?.rejectedAt),
  pickupAddress: str(j?.pickupAddress),
  pickupCity: str(j?.pickupCity),
  deliveryAddress: str(j?.deliveryAddress),
  deliveryCity: str(j?.deliveryCity),
  distanceKm: num(j?.distanceKm),
  totalWeight: num(j?.totalWeight),
  payout: num(j?.payout),
});

export type RejectedJobsResponse = Envelope<{ history?: { docs: RejectedJob[] } }>;

export const parseRejectedJobsResponse = (j: any): RejectedJobsResponse => ({
  status: j?.status,
  message: j?.message,
  data: j?.data
    ? { history: j.data.history ? { docs: list(j.data.history.docs, parseRejectedJob) } : undefined }
    : null,
});
