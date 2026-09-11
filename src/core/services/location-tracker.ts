/**
 * Every position the app reports, from one place: the live stream a customer
 * watches during a trip, the on-duty position dispatch offers work by, and the
 * ten-minute log the office keeps of the vehicle's route.
 *
 * They share a single OS background task rather than running one each. Two
 * location tasks mean two foreground services, two permanent notifications and
 * two GPS clients fighting over cadence; one task that changes pace with the
 * driver's state does the same job. The paces:
 *
 *   trip  → a fix every few seconds, streamed to the customer's map
 *   duty  → a fix every couple of minutes, for dispatch and the route log
 *   off   → nothing
 *
 * Three things make this harder than "watch position and emit":
 *
 *  · The app is usually not in front. A driver on a job has Maps open, or the
 *    screen off. So this runs as an OS-level background task with an Android
 *    foreground-service notification, not a `watchPositionAsync` in a screen.
 *  · The task can run in a JS context that has no memory of the app. Android
 *    may relaunch it headless after the process dies, so anything it needs —
 *    which trip, whether the driver is on duty, the unsent backlog — lives in
 *    MMKV rather than in module state, which would silently be empty there.
 *  · Coverage is the worst exactly where trucks go. A fix that cannot be sent
 *    is buffered and replayed, because a gap in the trail is precisely what the
 *    customer notices and calls about.
 *
 * Background permission is only ever requested behind the prominent disclosure
 * (see requestBackground). Google Play rejected 1.1.0 for prompting without
 * one. Without that permission everything degrades to foreground watches: the
 * app still reports while open, it just stops when backgrounded.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState, Platform } from 'react-native';

import { ApiService } from '../api/api-service';
import { ApiUrls } from '../api/endpoints';
import { DispatchSocket } from '../realtime/socket';
import { Preference } from '../storage/preference';
import { JobRepository } from './job-repository';
import {
  type LocationFix,
  MIN_DISPLACEMENT_METRES,
  distanceMetres,
} from '@/types/location';

/** Registered with the OS; the string is persisted by the system, so it is fixed. */
const TASK_NAME = 'bst-driver-location';

/**
 * The duty-logging task 1.1.x ran on its own. A phone updating from that build
 * still has it registered and running, so it is defined here (as a no-op) and
 * stopped on the next start rather than left posting to a task nobody handles.
 */
const LEGACY_TASK_NAME = 'bst-driver-location-task';

const KEY_TRIP = 'tracking.tripId';
const KEY_TRIP_STATUS = 'tracking.tripStatusNumber';
const KEY_ON_DUTY = 'tracking.onDuty';
/** Which pace the background task was last started at. */
const KEY_MODE = 'tracking.mode';
const KEY_LAST_FIX = 'tracking.lastFix';
const KEY_BUFFER = 'tracking.buffer';
const KEY_LAST_DUTY_FIX = 'tracking.lastDutyFix';
const KEY_LAST_LOG_AT = 'tracking.lastLogAt';
/** Same key 1.1.x queued under, so pings it left unsent still go out. */
const KEY_LOG_QUEUE = 'pending_locations';

type Mode = 'trip' | 'duty' | 'off';

// ── Paces ────────────────────────────────────────────────────

/**
 * Floor on how often a trip fix is forwarded. The OS honours `timeInterval`
 * loosely and will hand over a burst after a doze window, so this is what
 * actually bounds the traffic.
 */
const MIN_SEND_INTERVAL_MS = 5000;

/**
 * Ceiling on silence during a trip. Past this a fix is sent even if the truck
 * has not moved far enough to clear the displacement gate — a customer
 * watching a stationary marker needs to see it is still *live*, and the server
 * needs a heartbeat to tell "parked" from "phone died".
 */
const HEARTBEAT_MS = 45000;

/**
 * Trip backlog cap. A driver can be out of coverage for hours; without a cap
 * the buffer grows until MMKV writes start costing real time on every fix.
 * Oldest go first — for a trail replayed late, recent positions are what matter.
 */
const MAX_BUFFERED_FIXES = 250;

/**
 * How often an idle on-duty driver reports where they are, for dispatch.
 *
 * Far coarser than trip tracking, because nobody is watching a map — this
 * exists so the server can offer work to the drivers nearest a pickup, and put
 * a true "6 min away" on the offer card. Two minutes, or 500 m of movement, is
 * plenty for that and costs almost nothing in battery.
 */
const DUTY_PING_INTERVAL_MS = 120000;
const DUTY_PING_DISPLACEMENT_M = 500;

/** The office's route log: one entry per ten minutes on duty. */
const LOG_INTERVAL_MS = 10 * 60 * 1000;
/** Log backlog cap. Oldest pings are dropped first. */
const MAX_LOG_QUEUE = 100;

// ── Persisted scraps ─────────────────────────────────────────

const readJson = <T,>(key: string, fallback: T): T => {
  const raw = Preference.raw.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void =>
  Preference.raw.set(key, JSON.stringify(value));

const currentMode = (): Mode => {
  if (Preference.raw.getString(KEY_TRIP)) return 'trip';
  if (Preference.raw.getString(KEY_ON_DUTY)) return 'duty';
  return 'off';
};

// ── Trip stream ──────────────────────────────────────────────

/**
 * Hands a fix to the server, preferring the socket and falling back to the
 * batched HTTP endpoint. Anything that cannot go out now is buffered.
 */
async function deliver(fix: LocationFix): Promise<void> {
  const buffered = readJson<LocationFix[]>(KEY_BUFFER, []);

  if (DispatchSocket.sendLocation(fix)) {
    if (buffered.length === 0) return;
    // The socket is back and there is a backlog. Replay it over HTTP in one
    // request rather than as a burst of emits, and only clear it once the
    // server has actually taken it.
    try {
      await JobRepository.pushLocations(buffered);
      Preference.raw.remove(KEY_BUFFER);
    } catch (e) {
      if (__DEV__) console.log('location backlog flush failed:', e);
    }
    return;
  }

  const next = [...buffered, fix];
  writeJson(KEY_BUFFER, next.slice(-MAX_BUFFERED_FIXES));

  // Still worth one direct attempt: the socket being down usually means the
  // app was backgrounded, not that the network is gone.
  try {
    await JobRepository.pushLocations(next.slice(-MAX_BUFFERED_FIXES));
    Preference.raw.remove(KEY_BUFFER);
  } catch {
    // Genuinely offline. It stays buffered for the next fix to retry.
  }
}

const toFix = (location: Location.LocationObject, tripId?: string): LocationFix => ({
  tripId,
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
  accuracy: location.coords.accuracy ?? undefined,
  heading: location.coords.heading ?? undefined,
  speed: location.coords.speed ?? undefined,
  recordedAt: location.timestamp,
});

/**
 * Applies the trip send gates and forwards the fix if it clears them. Shared by
 * the background task and the foreground fallback, so the trail is equally
 * smooth either way.
 */
async function reportTripFix(location: Location.LocationObject): Promise<void> {
  const tripId = Preference.raw.getString(KEY_TRIP);
  // No active trip means tracking is winding down; drop rather than buffer, or
  // the next trip opens with a trail from the last one.
  if (!tripId) return;

  const fix = toFix(location, tripId);
  const last = readJson<LocationFix | null>(KEY_LAST_FIX, null);
  if (last && last.tripId === tripId) {
    const elapsed = fix.recordedAt - last.recordedAt;
    const moved = distanceMetres(last, fix);

    if (elapsed < MIN_SEND_INTERVAL_MS) return;
    if (moved < MIN_DISPLACEMENT_METRES && elapsed < HEARTBEAT_MS) return;
  }

  writeJson(KEY_LAST_FIX, fix);
  await deliver(fix);
}

// ── Duty position ────────────────────────────────────────────

/**
 * Reports an idle on-duty driver's position, with no tripId — the server
 * stores that as their last-known position and nothing more: no trail row,
 * nothing relayed.
 *
 * Sent straight out with no buffering: a duty fix that fails is superseded by
 * the next one, and a replayed queue of stale positions is worth nothing to
 * dispatch.
 */
async function reportDutyFix(location: Location.LocationObject): Promise<void> {
  const fix = toFix(location);
  const last = readJson<LocationFix | null>(KEY_LAST_DUTY_FIX, null);
  if (last) {
    const elapsed = fix.recordedAt - last.recordedAt;
    const moved = distanceMetres(last, fix);
    if (elapsed < DUTY_PING_INTERVAL_MS && moved < DUTY_PING_DISPLACEMENT_M) return;
  }
  writeJson(KEY_LAST_DUTY_FIX, fix);

  if (!DispatchSocket.sendLocation(fix)) {
    await JobRepository.pushLocations([fix]).catch(() => {
      /* Offline. The next ping carries the current position. */
    });
  }
}

// ── Route log ────────────────────────────────────────────────

interface LocationPing {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  tripId?: string | null;
  tripStatusNumber?: number | null;
  recordedAt: string;
  source?: 'interval' | 'manual' | 'status-change';
}

function writeLogQueue(pings: LocationPing[]): void {
  try {
    // Keep the newest: on a long outage recent positions matter more than
    // stale ones, and an unbounded queue would grow without limit.
    writeJson(KEY_LOG_QUEUE, pings.slice(-MAX_LOG_QUEUE));
  } catch {
    // A failed write costs one ping; never break tracking over it.
  }
}

/**
 * Sends every queued log ping. On failure the queue is left untouched so the
 * next attempt retries it — the entire point of queueing first.
 */
async function flushLog(): Promise<void> {
  const queued = readJson<LocationPing[]>(KEY_LOG_QUEUE, []);
  if (queued.length === 0) return;

  try {
    await ApiService.post(ApiUrls.logLocation, { locations: queued });
    // Re-read rather than assuming: a ping may have arrived while the request
    // was in flight, and blindly clearing would discard it.
    const after = readJson<LocationPing[]>(KEY_LOG_QUEUE, []);
    writeLogQueue(after.slice(queued.length));
  } catch (e) {
    if (__DEV__) console.log('location log flush failed, will retry:', e);
  }
}

/**
 * Queues a route-log ping and tries to send. `force` skips the ten-minute gate,
 * for the one-off capture taken when a driver goes on duty without background
 * permission.
 */
async function logPosition(
  location: Location.LocationObject,
  source: LocationPing['source'],
  force = false,
): Promise<void> {
  const lastAt = Number(Preference.raw.getString(KEY_LAST_LOG_AT) ?? 0);
  if (!force && location.timestamp - lastAt < LOG_INTERVAL_MS) return;
  Preference.raw.set(KEY_LAST_LOG_AT, String(location.timestamp));

  const statusRaw = Preference.raw.getString(KEY_TRIP_STATUS);
  const ping: LocationPing = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    heading: location.coords.heading,
    altitude: location.coords.altitude,
    tripId: Preference.raw.getString(KEY_TRIP) ?? null,
    tripStatusNumber: statusRaw ? Number(statusRaw) : null,
    // The device's own clock: when pings flush late, this is the time that
    // actually describes where the driver was.
    recordedAt: new Date(location.timestamp).toISOString(),
    source,
  };

  writeLogQueue([...readJson<LocationPing[]>(KEY_LOG_QUEUE, []), ping]);
  await flushLog();
}

/** One fix, whichever path it arrived by, routed to everything that wants it. */
async function handleFix(location: Location.LocationObject): Promise<void> {
  if (Preference.raw.getString(KEY_TRIP)) await reportTripFix(location);
  else await reportDutyFix(location);
  await logPosition(location, 'interval');
}

// ── Background task ──────────────────────────────────────────

/**
 * The OS-side entry point. Defined at module scope, as TaskManager requires:
 * the registration has to exist before React mounts, because Android can start
 * this task in a fresh process with no UI at all.
 */
TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    if (__DEV__) console.log('location task error:', error);
    return;
  }
  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  // A doze window releases a batch at once. Only the newest is worth handling —
  // the rest are history the customer's map has already moved past.
  const latest = locations?.[locations.length - 1];
  if (latest) await handleFix(latest);
});

TaskManager.defineTask(LEGACY_TASK_NAME, async () => {
  // Superseded by TASK_NAME; stopped by applyMode. Nothing to do if it fires
  // once more in between.
});

const TASK_OPTIONS: Record<'trip' | 'duty', Location.LocationTaskOptions> = {
  trip: {
    // High rather than BestForNavigation: the extra precision buys nothing on
    // a customer's map at city zoom and costs a great deal of battery over an
    // eight-hour shift.
    accuracy: Location.Accuracy.High,
    timeInterval: MIN_SEND_INTERVAL_MS,
    distanceInterval: MIN_DISPLACEMENT_METRES,
    // Let the OS release a doze-window batch rather than waking the app per
    // fix; the task keeps only the newest anyway.
    deferredUpdatesInterval: MIN_SEND_INTERVAL_MS,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Trip in progress',
      notificationBody: 'Sharing your location with the customer.',
      notificationColor: '#004B64',
    },
  },
  duty: {
    // Balanced, not High: this answers "which part of town", not "which lane",
    // and it runs for a whole shift.
    accuracy: Location.Accuracy.Balanced,
    timeInterval: DUTY_PING_INTERVAL_MS,
    // Without a distance floor a stationary phone would still wake the task on
    // every interval.
    distanceInterval: 50,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'BST Driver',
      notificationBody: 'Logging your location while you are on duty',
      notificationColor: '#004B64',
    },
  },
};

// ── Foreground fallback ──────────────────────────────────────

/** Live only when running without background permission. */
let foregroundWatch: Location.LocationSubscription | null = null;
let foregroundWatchMode: Mode = 'off';

async function startForegroundWatch(mode: 'trip' | 'duty'): Promise<void> {
  if (foregroundWatch && foregroundWatchMode === mode) return;
  stopForegroundWatch();
  foregroundWatchMode = mode;
  foregroundWatch = await Location.watchPositionAsync(
    mode === 'trip'
      ? {
          accuracy: Location.Accuracy.High,
          timeInterval: MIN_SEND_INTERVAL_MS,
          distanceInterval: MIN_DISPLACEMENT_METRES,
        }
      : {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: DUTY_PING_INTERVAL_MS,
          distanceInterval: DUTY_PING_DISPLACEMENT_M,
        },
    (location) => void handleFix(location),
  );
}

function stopForegroundWatch(): void {
  foregroundWatch?.remove();
  foregroundWatch = null;
  foregroundWatchMode = 'off';
}

// ── Reconciling ──────────────────────────────────────────────

/**
 * Grants-or-asks, in that order.
 *
 * Requesting a permission that is already granted is harmless, but requesting
 * one that was denied-but-askable re-raises the system dialog — and this runs
 * on every trip refresh. Checking first turns a repeating popup into a no-op.
 */
async function ensureForegroundGranted(): Promise<boolean> {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    return (await Location.requestForegroundPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Check only. Asking is requestBackground's job, behind the disclosure. */
const hasBackgroundPermission = async (): Promise<boolean> =>
  (await Location.getBackgroundPermissionsAsync().catch(() => null))?.granted ?? false;

const isTaskRunning = (name: string): Promise<boolean> =>
  Location.hasStartedLocationUpdatesAsync(name).catch(() => false);

async function stopTask(name: string): Promise<void> {
  try {
    if (await isTaskRunning(name)) await Location.stopLocationUpdatesAsync(name);
  } catch (e) {
    if (__DEV__) console.log(`stopLocationUpdates(${name}) failed:`, e);
  }
}

async function applyModeNow(): Promise<void> {
  await stopTask(LEGACY_TASK_NAME);

  const mode = currentMode();
  if (mode === 'off') {
    stopForegroundWatch();
    await stopTask(TASK_NAME);
    Preference.raw.remove(KEY_MODE);
    return;
  }

  if (!(await ensureForegroundGranted())) {
    if (__DEV__) console.log('location tracking: foreground permission denied');
    return;
  }

  if (!(await hasBackgroundPermission())) {
    // No background permission: report while the app is open, and make sure no
    // task from an earlier grant is left running without it.
    await stopTask(TASK_NAME);
    Preference.raw.remove(KEY_MODE);
    await startForegroundWatch(mode);
    return;
  }

  stopForegroundWatch();
  // The task outlives the process, so "running at this pace" is read back from
  // both the OS and storage. Restarting is only for a change of pace.
  if ((await isTaskRunning(TASK_NAME)) && Preference.raw.getString(KEY_MODE) === mode) return;

  await stopTask(TASK_NAME);
  await Location.startLocationUpdatesAsync(TASK_NAME, TASK_OPTIONS[mode]);
  Preference.raw.set(KEY_MODE, mode);
}

/**
 * Serialised, because trip refreshes and duty changes arrive together — on
 * launch both fire within milliseconds — and two interleaved runs would start
 * the task twice or stop it underneath each other.
 */
let applying: Promise<void> = Promise.resolve();
function applyMode(): Promise<void> {
  applying = applying.then(applyModeNow).catch((e) => {
    if (__DEV__) console.log('location applyMode failed:', e);
  });
  return applying;
}

/** Sends what the trip stream buffered. Called before anything is cleared. */
async function flushTripBuffer(): Promise<void> {
  const buffered = readJson<LocationFix[]>(KEY_BUFFER, []);
  if (buffered.length === 0) return;
  try {
    await JobRepository.pushLocations(buffered);
    Preference.raw.remove(KEY_BUFFER);
  } catch (e) {
    if (__DEV__) console.log('final location flush failed:', e);
  }
}

// Queued log pings go out whenever the app comes forward, independent of the
// task, so a backlog clears as soon as there is connectivity.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void flushLog();
});

// ── Public surface ───────────────────────────────────────────

export const LocationTracker = {
  /** The trip currently being tracked, if any. */
  activeTripId: (): string | undefined => Preference.raw.getString(KEY_TRIP),

  /**
   * Reconciles tracking with the trip the driver actually holds.
   *
   * Called after every trip refresh. Without it, tracking outlives its trip in
   * both directions: a delivery completed on another device leaves the fast
   * stream running for hours, and an app restart mid-trip never restarts it.
   * Ending a trip drops back to the duty pace rather than stopping outright,
   * when the driver is still on duty.
   */
  async sync(tripId: string | undefined, statusNumber?: number): Promise<void> {
    const previous = Preference.raw.getString(KEY_TRIP);

    if (tripId) {
      if (previous !== tripId) {
        // A new trip starts with a clean slate, so the displacement gate is not
        // measured against a fix from the previous job's drop point.
        Preference.raw.remove(KEY_LAST_FIX);
      }
      Preference.raw.set(KEY_TRIP, tripId);
      if (statusNumber != null) Preference.raw.set(KEY_TRIP_STATUS, String(statusNumber));
      else Preference.raw.remove(KEY_TRIP_STATUS);
    } else if (previous) {
      // Delivery is the moment the tail of the trail matters most, and the
      // moment it would otherwise be discarded.
      await flushTripBuffer();
      Preference.raw.remove(KEY_TRIP);
      Preference.raw.remove(KEY_TRIP_STATUS);
      Preference.raw.remove(KEY_LAST_FIX);
    }

    await applyMode();
  },

  /**
   * On duty: report position for dispatch and the route log.
   *
   * Never prompts — it runs on app launch for a driver already on duty, where a
   * permission dialog out of nowhere would be refused. Background reporting
   * starts only if the driver already granted it; the duty toggle is where
   * requestBackground asks.
   */
  async startDuty(): Promise<void> {
    Preference.raw.set(KEY_ON_DUTY, '1');
    await applyMode();
  },

  /** Off duty. A trip still in progress keeps streaming to its customer. */
  async stopDuty(): Promise<void> {
    Preference.raw.remove(KEY_ON_DUTY);
    Preference.raw.remove(KEY_LAST_DUTY_FIX);
    await flushLog();
    await applyMode();
  },

  /**
   * Asks for background location, behind the prominent disclosure.
   *
   * `confirmDisclosure` is shown before the OS prompt and must resolve true for
   * that prompt to appear — Google Play requires the app's own disclosure first,
   * and rejected 1.1.0 for prompting without one. Declining is a real choice:
   * the driver stays on duty with foreground-only reporting.
   *
   * The disclosure is skipped once permission is permanently denied, where
   * showing it would only nag with an Allow button the OS no longer honours.
   * Returns whether background reporting is now allowed.
   */
  async requestBackground(confirmDisclosure: () => Promise<boolean>): Promise<boolean> {
    try {
      if (!(await Location.getForegroundPermissionsAsync()).granted) return false;

      const background = await Location.getBackgroundPermissionsAsync();
      if (!background.granted) {
        const allowed =
          background.canAskAgain &&
          (await confirmDisclosure()) &&
          (await Location.requestBackgroundPermissionsAsync()).granted;

        if (!allowed) {
          // Take one fix now, so going on duty still records something.
          await LocationTracker.captureOnce('status-change');
          await applyMode();
          return false;
        }
      }

      await applyMode();
      return true;
    } catch (e) {
      if (__DEV__) console.log('requestBackground failed:', e);
      return false;
    }
  },

  /** Takes a route-log fix immediately, outside the interval. */
  async captureOnce(source: LocationPing['source'] = 'manual'): Promise<void> {
    try {
      if (!(await Location.getForegroundPermissionsAsync()).granted) return;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await logPosition(position, source, true);
    } catch (e) {
      if (__DEV__) console.log('location capture failed:', e);
    }
  },

  /**
   * Stops everything and forgets the trip and duty state. Logout and account
   * deletion — the only paths where duty never flips off first. Unsent fixes
   * and log pings are flushed while the token still works.
   */
  async stop(): Promise<void> {
    await Promise.all([flushTripBuffer(), flushLog()]);

    Preference.raw.remove(KEY_TRIP);
    Preference.raw.remove(KEY_TRIP_STATUS);
    Preference.raw.remove(KEY_ON_DUTY);
    Preference.raw.remove(KEY_LAST_FIX);
    Preference.raw.remove(KEY_LAST_DUTY_FIX);

    await applyMode();
  },

  /** Pending route-log count — useful when a driver reports missing pings. */
  pendingLogCount: (): number => readJson<LocationPing[]>(KEY_LOG_QUEUE, []).length,

  /** True when the OS-level background task is running. */
  isTracking: async (): Promise<boolean> =>
    Platform.OS === 'web' ? false : await isTaskRunning(TASK_NAME),
} as const;
