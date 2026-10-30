/**
 * The Rejected tab of the Cancelled Trips screen: offers this driver declined.
 * Its own store, paging independently of the cancelled list beside it.
 */
import { create } from 'zustand';

import { TripHistoryRepository } from '@/core/services/history-repository';
import type { RejectedJob } from '@/types/history';

const PER_PAGE = 10;

interface RejectedState {
  isLoading: boolean;
  currentPage: number;
  hasNextPage: boolean;
  jobs: RejectedJob[];
  /** True once a fetch has finished, so the empty state waits for real data. */
  loaded: boolean;

  reset: () => void;
  getRejectedJobs: () => Promise<void>;
}

export const useRejectedStore = create<RejectedState>((set, get) => ({
  isLoading: false,
  currentPage: 1,
  hasNextPage: true,
  jobs: [],
  loaded: false,

  reset: () => set({ currentPage: 1, hasNextPage: true, jobs: [], loaded: false }),

  async getRejectedJobs() {
    const { isLoading, hasNextPage, currentPage } = get();
    if (isLoading || !hasNextPage) return;

    set({ isLoading: true });
    try {
      const response = await TripHistoryRepository.rejectedJobs(currentPage, PER_PAGE);
      const docs = response.data?.history?.docs ?? [];
      if (docs.length === 0) {
        set({ hasNextPage: false });
      } else {
        set({ jobs: [...get().jobs, ...docs], currentPage: currentPage + 1 });
      }
    } catch (e) {
      if (__DEV__) console.log('getRejectedJobs failed:', e);
    }
    set({ isLoading: false, loaded: true });
  },
}));
