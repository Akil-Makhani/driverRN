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
  pickupAddress?: string;
  totalWeight?: number;
}

export const parseTripDoc = (j: any): TripDoc => ({
  id: str(j?._id),
  subOrderId: str(j?.subOrderId),
  orderId: str(j?.orderId),
  statusNumber: num(j?.statusNumber),
  state: j?.state ? parseTripState(j.state) : undefined,
  driverTripNumber: num(j?.driverTripNumber),
  updatedAt: formatTimestamp(j?.updatedAt),
  pickupAddress: str(j?.pickupAddress),
  totalWeight: num(j?.totalWeight),
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
