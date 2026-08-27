/** Replaces lib/screens/dashboard/view_model/dashboard_view_model.dart. */
import { create } from 'zustand';

import { TripStatus } from '@/core/constants/enums';
import { DashboardRepository } from '@/core/services/dashboard-repository';
import { useSession } from '@/core/session';
import { isSuccess } from '@/types/api';
import type { Product, TripIdModel, TripItem } from '@/types/trip';

interface DashboardState {
  selectedDutyValue: boolean;
  isLoading: boolean;
  completedTripCount: number;
  activeTrips: TripItem[];
  inTransitTrips: TripItem[];
  /** Master product list, loaded once and handed to the confirm-load sheet. */
  products: Product[];

  syncDutyFromSession: () => void;
  setDuty: (value: boolean) => Promise<void>;
  getProducts: () => Promise<void>;
  getTrips: () => Promise<void>;
  acceptTrip: (tripId: string) => Promise<void>;
  deliverAll: (model: TripIdModel) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  selectedDutyValue: false,
  isLoading: false,
  completedTripCount: 0,
  activeTrips: [],
  inTransitTrips: [],
  products: [],

  /** setInitialDataAndApiCall — seeds the switch from the logged-in profile. */
  syncDutyFromSession() {
    set({ selectedDutyValue: useSession.getState().user?.dutyStatus === 'on' });
  },

  async setDuty(value) {
    // Optimistic: the switch follows the tap immediately, then reconciles with
    // the server's answer. Dart left the old value on screen until the request
    // returned, which made the toggle feel broken on a slow connection.
    set({ selectedDutyValue: value });
    try {
      const response = await DashboardRepository.setDuty(value);
      set({ selectedDutyValue: response.data?.dutyStatus === 'on' });
    } catch (e) {
      if (__DEV__) console.log('setDuty failed:', e);
      set({ selectedDutyValue: !value });
    }
  },

  async getProducts() {
    try {
      const response = await DashboardRepository.getProduct();
      if (isSuccess(response)) set({ products: response.data ?? [] });
    } catch (e) {
      if (__DEV__) console.log('getProducts failed:', e);
    }
  },

  async getTrips() {
    set({ isLoading: true });
    try {
      const response = await DashboardRepository.getTrips();
      if (isSuccess(response)) {
        set({
          activeTrips: response.data?.active ?? [],
          inTransitTrips: response.data?.inTransit ?? [],
          completedTripCount: response.data?.completedTripCount ?? 0,
        });
      }
    } catch (e) {
      if (__DEV__) console.log('getTrips failed:', e);
    }
    set({ isLoading: false });
  },

  async acceptTrip(tripId) {
    set({ isLoading: true });
    try {
      const response = await DashboardRepository.statusChanged(
        tripId,
        TripStatus.accepted,
      );
      if (isSuccess(response)) {
        // Awaited, unlike Dart's fire-and-forget getTrips(), so the spinner
        // covers the refetch instead of clearing while the list is still stale.
        await get().getTrips();
        return;
      }
    } catch (e) {
      if (__DEV__) console.log('acceptTrip failed:', e);
    }
    set({ isLoading: false });
  },

  async deliverAll(model) {
    set({ isLoading: true });
    try {
      const response = await DashboardRepository.deliverAll(model);
      if (isSuccess(response)) {
        await get().getTrips();
        return;
      }
    } catch (e) {
      if (__DEV__) console.log('deliverAll failed:', e);
    }
    set({ isLoading: false });
  },
}));
