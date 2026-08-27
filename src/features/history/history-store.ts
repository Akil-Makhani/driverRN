/** Replaces lib/screens/trips_history/view_model/trip_history_view_model.dart. */
import { create } from 'zustand';

import { TripHistoryRepository } from '@/core/services/history-repository';
import type { TripDoc } from '@/types/history';

const PER_PAGE = 10;

interface HistoryState {
  isLoading: boolean;
  currentPage: number;
  hasNextPage: boolean;
  tripHistory: TripDoc[];
  completedTripCount: number;

  /** initialValue() — clears the list before the screen refetches page 1. */
  reset: () => void;
  getTripHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  isLoading: false,
  currentPage: 1,
  hasNextPage: true,
  tripHistory: [],
  completedTripCount: 0,

  reset: () =>
    set({ currentPage: 1, hasNextPage: true, tripHistory: [] }),

  async getTripHistory() {
    const { isLoading, hasNextPage, currentPage } = get();
    if (isLoading || !hasNextPage) return;

    set({ isLoading: true });
    try {
      const response = await TripHistoryRepository.tripHistory(currentPage, PER_PAGE);
      const docs = response.data?.history?.docs ?? [];
      if (docs.length === 0) {
        set({ hasNextPage: false });
      } else {
        set({
          completedTripCount: response.data?.completedTripsCount ?? 0,
          tripHistory: [...get().tripHistory, ...docs],
          currentPage: currentPage + 1,
        });
      }
    } catch (e) {
      if (__DEV__) console.log('getTripHistory failed:', e);
    }
    set({ isLoading: false });
  },
}));
