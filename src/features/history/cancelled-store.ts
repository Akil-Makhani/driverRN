/**
 * The Cancelled Trips list.
 *
 * A separate store from useHistoryStore rather than a filter on it: the two
 * screens page independently, and sharing one list meant opening either screen
 * reset the other's scroll position mid-fetch.
 */
import { create } from 'zustand';

import { TripHistoryRepository } from '@/core/services/history-repository';
import type { TripDoc } from '@/types/history';

const PER_PAGE = 10;

interface CancelledState {
  isLoading: boolean;
  currentPage: number;
  hasNextPage: boolean;
  trips: TripDoc[];
  /** True once a fetch has finished, so the empty state waits for real data. */
  loaded: boolean;

  reset: () => void;
  getCancelledTrips: () => Promise<void>;
}

export const useCancelledStore = create<CancelledState>((set, get) => ({
  isLoading: false,
  currentPage: 1,
  hasNextPage: true,
  trips: [],
  loaded: false,

  reset: () => set({ currentPage: 1, hasNextPage: true, trips: [], loaded: false }),

  async getCancelledTrips() {
    const { isLoading, hasNextPage, currentPage } = get();
    if (isLoading || !hasNextPage) return;

    set({ isLoading: true });
    try {
      const response = await TripHistoryRepository.cancelledTrips(currentPage, PER_PAGE);
      const docs = response.data?.history?.docs ?? [];
      if (docs.length === 0) {
        set({ hasNextPage: false });
      } else {
        set({
          trips: [...get().trips, ...docs],
          currentPage: currentPage + 1,
        });
      }
    } catch (e) {
      if (__DEV__) console.log('getCancelledTrips failed:', e);
    }
    set({ isLoading: false, loaded: true });
  },
}));
