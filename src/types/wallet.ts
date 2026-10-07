/**
 * GET /driver/wallet — what each delivered tempo trip earned and what the
 * office has paid. Earned is the payout the offer card showed at accept; the
 * office pays by cash or UPI outside the app and records it in the admin panel.
 */
import { type Envelope, list, num, str } from './api';
import { formatTimestamp } from '@/core/utils/date-format';

export interface WalletSummary {
  tripCount: number;
  totalEarned: number;
  totalPaid: number;
  balance: number;
}

export interface WalletTrip {
  tripId?: string;
  driverTripNumber?: number;
  orderNumber?: string;
  deliveredAt?: string;
  amount: number;
  pickup?: string;
  delivery?: string;
}

export type PaymentMode = 'cash' | 'upi';

export interface WalletPayment {
  id?: string;
  amount: number;
  mode: PaymentMode;
  note?: string;
  paidAt?: string;
}

export interface Wallet {
  summary: WalletSummary;
  trips: WalletTrip[];
  payments: WalletPayment[];
}

export type WalletResponse = Envelope<Wallet>;

const parseTrip = (j: any): WalletTrip => ({
  tripId: str(j?.tripId),
  driverTripNumber: num(j?.driverTripNumber),
  orderNumber: str(j?.orderNumber ?? undefined),
  deliveredAt: formatTimestamp(j?.deliveredAt),
  amount: num(j?.amount) ?? 0,
  pickup: str(j?.pickup) || undefined,
  delivery: str(j?.delivery) || undefined,
});

const parsePayment = (j: any): WalletPayment => ({
  id: str(j?._id),
  amount: num(j?.amount) ?? 0,
  mode: j?.mode === 'upi' ? 'upi' : 'cash',
  note: str(j?.note ?? undefined) || undefined,
  paidAt: formatTimestamp(j?.paidAt),
});

export const parseWalletResponse = (j: any): WalletResponse => ({
  status: j?.status,
  message: j?.message,
  data: j?.data
    ? {
        summary: {
          tripCount: num(j.data.summary?.tripCount) ?? 0,
          totalEarned: num(j.data.summary?.totalEarned) ?? 0,
          totalPaid: num(j.data.summary?.totalPaid) ?? 0,
          balance: num(j.data.summary?.balance) ?? 0,
        },
        trips: list(j.data.trips, parseTrip),
        payments: list(j.data.payments, parsePayment),
      }
    : null,
});
