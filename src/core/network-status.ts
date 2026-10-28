/**
 * How the connection to the server looks from this phone, judged by the API
 * calls the app is already making.
 *
 * Drivers on a weak signal saw the app go quiet — offers late, buttons that
 * spun for thirty seconds and then failed with an English sentence — with
 * nothing telling them the problem was their network. api-service reports
 * every call's outcome here and the banner in the root layout reads it, in the
 * driver's language.
 *
 *   ok      the last call came back in reasonable time
 *   slow    a call has been waiting longer than SLOW_AFTER_MS, or timed out
 *   offline a call could not reach the server at all
 */
import { create } from 'zustand';

export type NetworkStatus = 'ok' | 'slow' | 'offline';

/** A call still waiting after this long means the driver is on a slow network. */
export const SLOW_AFTER_MS = 6000;

interface NetworkState {
  status: NetworkStatus;
  setStatus: (status: NetworkStatus) => void;
}

export const useNetworkStatus = create<NetworkState>((set, get) => ({
  status: 'ok',
  setStatus: (status) => {
    if (get().status !== status) set({ status });
  },
}));
