/**
 * The broadcast dispatch state machine.
 *
 * One order is offered to every on-duty driver at once and exactly one of them
 * gets it, so almost everything here is about a race the app cannot win by
 * being clever — only the server's atomic write decides. The rules that fall
 * out of that, and that the rest of this file exists to enforce:
 *
 *  1. An offer may arrive twice (socket *and* FCM). De-duplicate by id.
 *  2. Once accept is in flight, nothing but its own response may resolve that
 *     offer — a `job:taken` broadcast that races our own accept is very often
 *     the news that *we* won.
 *  3. The countdown is UI only. The server rejects a late accept regardless of
 *     what the phone's clock believed, so expiry here never has to be exact.
 *  4. Offers are shown one at a time. A driver choosing between two overlapping
 *     offers at a junction is a safety problem, not a feature.
 */
import { router } from 'expo-router';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { JobRepository } from '@/core/services/job-repository';
import { NotificationManager } from '@/core/services/notification-manager';
import { useDashboardStore } from '@/features/dashboard/dashboard-store';
import { Siren } from '@/core/services/siren';
import { DispatchSocket, SocketEvent } from '@/core/realtime/socket';
import { isSuccess } from '@/types/api';
import {
  type JobOffer,
  type JobOutcome,
  parseJobOffer,
  remainingSeconds,
} from '@/types/job';

/** How long the "another driver took it" line stays up before clearing. */
const OUTCOME_BANNER_MS = 2600;

export interface JobOutcomeNotice {
  offer: JobOffer;
  outcome: JobOutcome;
  message?: string;
}

interface JobState {
  /** Open offers, oldest first. Only `offers[0]` is ever on screen. */
  offers: JobOffer[];
  /**
   * Absolute epoch-ms deadline per offer id, fixed when the offer is enqueued.
   * Storing the deadline rather than a remaining-seconds countdown means the
   * clock stays correct across a re-render, a backgrounded app, or a dropped
   * interval tick — the UI can always recompute it from `Date.now()`.
   */
  deadlines: Record<string, number>;
  /** The offer whose accept is in flight. Blocks rules 2 and 4 above. */
  acceptingId: string | null;
  /**
   * Offers the driver has pushed aside by tapping outside the card.
   *
   * Deliberately NOT the same as declining. The offer stays live and keeps its
   * countdown; it simply stops taking over the screen and moves to a strip on
   * the dashboard, so a driver who is mid-conversation or mid-turn can come
   * back to it. Declining is a separate, explicit tap that tells the server.
   */
  minimisedIds: string[];
  /** The one-line result shown as an offer leaves the screen. */
  notice: JobOutcomeNotice | null;

  receive: (raw: unknown) => void;
  /** Re-decides whether the siren rings; for changes outside the store, like the app state. */
  refreshSiren: () => void;
  /** Pushes the card aside without answering it. */
  minimise: (jobId: string) => void;
  /** Brings a pushed-aside offer back to the front. */
  restore: (jobId: string) => void;
  accept: (jobId: string) => Promise<void>;
  reject: (jobId: string) => Promise<void>;
  expire: (jobId: string) => void;
  settle: (jobId: string, outcome: JobOutcome) => void;
  dismissNotice: () => void;
  syncOpenJobs: () => Promise<void>;
  clearAll: () => void;
}

let noticeTimer: ReturnType<typeof setTimeout> | null = null;
/** Unsubscribers for the socket listeners; set by `startJobListener`. */
let unsubscribers: (() => void)[] = [];

export const useJobStore = create<JobState>((set, get) => {
  /**
   * The alarm follows the state rather than being switched on and off at each
   * call site — with offers arriving from three directions (socket, push,
   * resync) and leaving from five, hand-managing it would guarantee a stuck
   * siren eventually. It rings while an unanswered offer is on screen.
   */
  const syncSiren = (): void => {
    const { offers, acceptingId, minimisedIds } = get();
    // Only an offer actually facing the driver rings. A minimised one has been
    // seen and pushed aside; carrying on ringing for it would be nagging, and
    // the driver would just turn the phone down and miss the next one too.
    const facing = offers.some((o) => !minimisedIds.includes(o.id));
    // Out of the foreground the offer notification is the alarm. The duty
    // location service keeps this process and its socket alive behind a locked
    // screen, so an offer lands here AND as a push, and ringing for both played
    // two sirens over each other.
    const inForeground = AppState.currentState === 'active';
    if (facing && acceptingId === null && inForeground) void Siren.start();
    else void Siren.stop();
  };

  /** Removes an offer from the queue and forgets its deadline. */
  const drop = (jobId: string): void => {
    const { offers, deadlines, minimisedIds } = get();
    const { [jobId]: _removed, ...rest } = deadlines;
    set({
      offers: offers.filter((o) => o.id !== jobId),
      deadlines: rest,
      minimisedIds: minimisedIds.filter((id) => id !== jobId),
    });
  };

  const showNotice = (notice: JobOutcomeNotice): void => {
    if (noticeTimer) clearTimeout(noticeTimer);
    set({ notice });
    noticeTimer = setTimeout(() => {
      noticeTimer = null;
      set({ notice: null });
    }, OUTCOME_BANNER_MS);
  };

  return {
    offers: [],
    deadlines: {},
    acceptingId: null,
    minimisedIds: [],
    notice: null,

    receive(raw) {
      const offer = parseJobOffer(
        // FCM data payloads are string-valued, so an offer that came in over a
        // push arrives as JSON in a string field rather than as an object.
        typeof raw === 'string' ? safeParse(raw) : raw,
      );
      if (!offer.id) return;

      const { offers, deadlines } = get();
      // Rule 1. Also covers the resync re-delivering what we already hold.
      if (offers.some((o) => o.id === offer.id)) return;

      set({
        offers: [...offers, offer],
        deadlines: {
          ...deadlines,
          [offer.id]: Date.now() + remainingSeconds(offer) * 1000,
        },
      });
      syncSiren();
    },

    refreshSiren: syncSiren,

    minimise(jobId) {
      const { minimisedIds } = get();
      if (minimisedIds.includes(jobId)) return;
      set({ minimisedIds: [...minimisedIds, jobId] });
      syncSiren();
    },

    restore(jobId) {
      set({ minimisedIds: get().minimisedIds.filter((id) => id !== jobId) });
      syncSiren();
    },

    async accept(jobId) {
      // Guard re-entry: the accept button is big and drivers are in a hurry.
      if (get().acceptingId) return;
      set({ acceptingId: jobId });
      // Stop the noise the instant the driver responds, not when the server
      // answers — otherwise it keeps ringing through the whole round trip.
      void Siren.stop();

      const result = await JobRepository.accept(jobId);
      const offer = get().offers.find((o) => o.id === jobId);

      set({ acceptingId: null });
      drop(jobId);

      if (result.won) {
        // The trip list is the driver's home screen and it is now stale by one
        // trip. Refresh before navigating so returning from the detail screen
        // does not show a dashboard missing the job just won.
        void useDashboardStore.getState().getTrips();

        const tripId = result.tripId ?? offer?.tripId;
        if (tripId) router.push(`/trip/${tripId}`);
      } else if (offer) {
        showNotice({ offer, outcome: result.outcome, message: result.message });
      }

      syncSiren();
    },

    async reject(jobId) {
      drop(jobId);
      syncSiren();
      await JobRepository.reject(jobId);
    },

    expire(jobId) {
      const offer = get().offers.find((o) => o.id === jobId);
      // Rule 2: an accept in flight outranks the countdown. The tap landed in
      // time even if the response has not come back yet.
      if (!offer || get().acceptingId === jobId) return;
      drop(jobId);
      showNotice({ offer, outcome: 'expired' });
      syncSiren();
    },

    settle(jobId, outcome) {
      // Rule 2 again, and the important case: the server broadcasts `job:taken`
      // to everyone including the winner, so acting on it here while our own
      // accept is still open would tell the driver who just *won* that they
      // lost. Let the HTTP response speak for that offer.
      if (get().acceptingId === jobId) return;

      const offer = get().offers.find((o) => o.id === jobId);
      if (!offer) return;

      // Read before dropping. Afterwards this offer is by definition no longer
      // at the head of the queue, so asking then would always answer "no".
      const wasOnScreen = get().offers[0]?.id === jobId;

      drop(jobId);
      // Only interrupt the driver about the offer they were actually looking
      // at. A queued offer being claimed elsewhere is not news.
      if (wasOnScreen) showNotice({ offer, outcome });
      syncSiren();
    },

    dismissNotice() {
      if (noticeTimer) clearTimeout(noticeTimer);
      noticeTimer = null;
      set({ notice: null });
    },

    async syncOpenJobs() {
      try {
        const response = await JobRepository.getOpenJobs();
        if (!isSuccess(response)) return;
        // Fed through `receive` one by one so de-duplication, deadlines and the
        // siren all behave exactly as they do for a live offer.
        response.data?.forEach((offer) => get().receive(offer));
      } catch (e) {
        if (__DEV__) console.log('syncOpenJobs failed:', e);
      }
    },

    clearAll() {
      if (noticeTimer) clearTimeout(noticeTimer);
      noticeTimer = null;
      set({ offers: [], deadlines: {}, acceptingId: null, minimisedIds: [], notice: null });
      void Siren.stop();
    },
  };
});

/** Tolerates a non-JSON string rather than throwing inside a push handler. */
function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Binds the store to the socket. Called when the driver goes on duty and torn
 * down when they go off; the returned function unsubscribes.
 */
export function startJobListener(): () => void {
  stopJobListener();

  const store = useJobStore.getState();
  unsubscribers = [
    DispatchSocket.on(SocketEvent.jobNew, (payload) => store.receive(payload)),
    DispatchSocket.on(SocketEvent.jobTaken, (payload) => {
      const jobId = payload?.jobId ?? payload?._id;
      if (jobId) store.settle(String(jobId), 'taken');
    }),
    DispatchSocket.on(SocketEvent.jobCancelled, (payload) => {
      const jobId = payload?.jobId ?? payload?._id;
      if (jobId) store.settle(String(jobId), 'cancelled');
    }),
    // A reconnect means we were deaf for some interval, so re-ask what is open
    // rather than assuming nothing was missed.
    DispatchSocket.onConnectionChange((isConnected) => {
      if (isConnected) void useJobStore.getState().syncOpenJobs();
    }),
    onForegroundChange(),
  ];

  return stopJobListener;
}

/**
 * Hands the alarm between the OS and the app as the app moves in and out of
 * the foreground, so exactly one of them rings at a time.
 */
function onForegroundChange(): () => void {
  const subscription = AppState.addEventListener('change', (state) => {
    // Silence the tray first. The in-app siren is the same sound, and starting
    // it on top of a notification still ringing is the doubling this prevents.
    if (state === 'active') void NotificationManager.dismissOfferNotifications();
    useJobStore.getState().refreshSiren();
  });
  return () => subscription.remove();
}

export function stopJobListener(): void {
  unsubscribers.forEach((off) => off());
  unsubscribers = [];
}
