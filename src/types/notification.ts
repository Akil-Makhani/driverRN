/**
 * Ports lib/screens/notification/model/{notification_model,
 * notification_count_response}.dart.
 */
import { Envelope, list, num, str } from './api';
import { formatTimestamp } from '../core/utils/date-format';

export interface NotificationMetadata {
  subOrderId?: string;
  driverTripNumber?: number;
  pickupLocation?: string;
  tempoId?: string;
  notificationTitle?: string;
}

export const parseNotificationMetadata = (j: any): NotificationMetadata => ({
  subOrderId: str(j?.subOrderId),
  driverTripNumber: num(j?.driverTripNumber),
  pickupLocation: str(j?.pickupLocation),
  tempoId: str(j?.tempoId),
  notificationTitle: str(j?.notificationTitle),
});

export interface NotificationDoc {
  id?: string;
  isSeen?: boolean;
  hasClicked?: boolean;
  status?: string;
  metadata?: NotificationMetadata;
  title?: string;
  recipientId?: string;
  tripId?: string;
  orderId?: string;
  /** Pre-formatted for display ("7:05 PM 3 Feb 2026"), as Dart did at parse. */
  createdAt?: string;
  updatedAt?: string;
}

export const parseNotificationDoc = (j: any): NotificationDoc => ({
  id: str(j?._id),
  isSeen: j?.isSeen === true,
  hasClicked: j?.hasClicked === true,
  status: str(j?.status),
  metadata: j?.metadata ? parseNotificationMetadata(j.metadata) : undefined,
  title: str(j?.title),
  recipientId: str(j?.recipientId),
  tripId: str(j?.tripId),
  orderId: str(j?.orderId),
  createdAt: formatTimestamp(j?.createdAt),
  updatedAt: str(j?.updatedAt),
});

export interface NotificationData {
  docs: NotificationDoc[];
  total?: number;
  limit?: number;
  page?: number;
  pages?: number;
}

export type NotificationResponse = Envelope<NotificationData>;

export const parseNotificationResponse = (j: any): NotificationResponse => ({
  status: j?.status,
  message: j?.message,
  data: j?.data
    ? {
        docs: list(j.data.docs, parseNotificationDoc),
        total: num(j.data.total),
        limit: num(j.data.limit),
        page: num(j.data.page),
        pages: num(j.data.pages),
      }
    : null,
});

/** The count endpoint returns a bare number in `data`. */
export type NotificationCountResponse = Envelope<number>;

export const parseNotificationCountResponse = (
  j: any,
): NotificationCountResponse => ({
  status: j?.status,
  message: j?.message,
  data: num(j?.data) ?? 0,
});
