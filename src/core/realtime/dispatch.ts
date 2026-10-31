/**
 * Turns the realtime layer on and off in step with the driver's duty switch.
 *
 * Everything the broadcast feature does is gated on one fact — is this driver
 * on duty — and that fact is already modelled by the dashboard's duty toggle.
 * Rather than have the toggle reach into the socket, the job store and the
 * siren (three call sites to keep in sync, and three chances to leave a socket
 * open after a driver clocks off), this subscribes to the toggle and drives
 * them from here.
 *
 * The dependency deliberately points this way. If the dashboard store imported
 * this module it would close a cycle — dashboard → dispatch → job store →
 * dashboard — and a cycle through three `create()` calls at module scope fails
 * in ways that are painful to debug.
 */
import { Alert, AppState, type AppStateStatus } from 'react-native';

import { watchLocationSetting } from '../../../modules/location-setting';
import { Strings } from '../constants/strings';
import { LocationTracker } from '../services/location-tracker';
import { NotificationManager, PushType } from '../services/notification-manager';
import { UserRepository } from '../services/user-repository';
import { Siren } from '../services/siren';
import { Preference } from '../storage/preference';
import { DispatchSocket } from './socket';
import { useDashboardStore } from '@/features/dashboard/dashboard-store';
import { startJobListener, stopJobListener, useJobStore } from '@/features/job/job-store';

let enabled = false;
let unregisterPush: (() => void) | null = null;
let stopLocationWatch: (() => void) | null = null;
let locationRetry: ReturnType<typeof setTimeout> | null = null;
let checkingLocation = false;

/** A failed Off Duty request (no network, say) is tried again this soon. */
const LOCATION_RETRY_MS = 30000;

/**
 * Takes the driver off duty once the phone can no longer report where they are:
 * dispatch offers work by position, so staying on duty would offer trips from
 * wherever the driver last was. They go back on duty themselves, from the
 * toggle, once location is on again.
 */
async function enforceLocation(): Promise<void> {
  if (!enabled || checkingLocation) return;
  checkingLocation = true;
  try {
    if (await LocationTracker.locationAvailable()) return;
    if (!enabled) return;

    await useDashboardStore.getState().setDuty(false);

    if (useDashboardStore.getState().selectedDutyValue) {
      locationRetry ??= setTimeout(() => {
        locationRetry = null;
        void enforceLocation();
      }, LOCATION_RETRY_MS);
      return;
    }
    if (AppState.currentState === 'active') {
      Alert.alert(Strings.dutyOffLocationTitle, Strings.dutyOffLocationBody);
    } else {
      void NotificationManager.notifyNow(
        Strings.dutyOffLocationTitle,
        Strings.dutyOffLocationBody,
      ).catch(() => {});
    }
  } finally {
    checkingLocation = false;
  }
}

/**
 * The FCM half of offer delivery, for when the socket is not up — which is
 * most of the time on Android, because the OS closes sockets within seconds of
 * the app leaving the foreground. This is what actually reaches a driver whose
 * phone is in their pocket.
 */
function registerPushHandling(): void {
  unregisterPush = NotificationManager.register({
    onDispatch: (type, data) => {
      const store = useJobStore.getState();

      if (type === PushType.jobOffer) {
        // A push can carry the whole offer inline, or just its id when the
        // payload would exceed FCM's 4KB data limit. Resync covers the second
        // case and costs one request.
        if (data.job) store.receive(data.job);
        else void store.syncOpenJobs();
        return;
      }

      const jobId = data.jobId ? String(data.jobId) : null;
      if (!jobId) return;
      if (type === PushType.jobTaken) store.settle(jobId, 'taken');
      else if (type === PushType.jobCancelled) store.settle(jobId, 'cancelled');
    },
  });
}

function enable(): void {
  if (enabled) return;
  if (!Preference.getAccessToken()) return;
  enabled = true;

  // Decode the alert clip now, while the driver is looking at the toggle,
  // rather than in the half-second an offer gives them to react.
  Siren.prepare();
  // Before any offer can be pushed, make sure the server has this device's
  // current token — going on duty is exactly the moment it starts mattering.
  void UserRepository.registerFcmToken();
  startJobListener();
  registerPushHandling();
  DispatchSocket.connect();
  // Report where the driver is while they wait, so the server can offer them
  // the work nearest them and show a real driving time to the pickup — and so
  // the office's route log covers the shift.
  void LocationTracker.startDuty();
  // The socket's own `connect` handler also resyncs, but that only fires once
  // it is actually up. Asking immediately means a driver clocking on with a
  // flaky connection still sees what is open.
  void useJobStore.getState().syncOpenJobs();
  stopLocationWatch = watchLocationSetting(() => void enforceLocation());
  void enforceLocation();
}

function disable(): void {
  if (!enabled) return;
  enabled = false;

  stopLocationWatch?.();
  stopLocationWatch = null;
  if (locationRetry) clearTimeout(locationRetry);
  locationRetry = null;
  stopJobListener();
  unregisterPush?.();
  unregisterPush = null;
  void LocationTracker.stopDuty();
  DispatchSocket.disconnect();
  // Clearing the queue matters as much as closing the socket: an offer left on
  // screen after clocking off is one the driver can still tap accept on, and
  // the server would rightly refuse it.
  useJobStore.getState().clearAll();
  Siren.release();
}

function handleAppStateChange(state: AppStateStatus): void {
  if (!enabled || state !== 'active') return;
  // Covers iOS, and anything missed while the process was not running.
  void enforceLocation();
  // Android tears down sockets in the background, and an offer may have come
  // and gone while the app slept. Reconnect, then re-ask what is still open.
  DispatchSocket.connect();
  void useJobStore.getState().syncOpenJobs();
}

export const Dispatch = {
  /**
   * Installs the wiring. Called once from the root layout; the returned
   * function tears it all down.
   */
  start(): () => void {
    const unsubscribeDuty = useDashboardStore.subscribe((state, previous) => {
      if (state.selectedDutyValue === previous.selectedDutyValue) return;
      if (state.selectedDutyValue) enable();
      else disable();
    });

    // The subscription only sees *changes*, so a driver who was already on
    // duty when the app cold-started would never trigger one.
    if (useDashboardStore.getState().selectedDutyValue) enable();

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      unsubscribeDuty();
      appStateSub.remove();
      disable();
    };
  },

  /** Logout and delete-account, where duty never flips to false first. */
  stop: disable,
} as const;
