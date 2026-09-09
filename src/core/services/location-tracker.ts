/**
 * Streams the driver's position while a trip is live, so the customer can watch
 * the truck move.
 *
 * Three things make this harder than "watch position and emit":
 *
 *  · The app is usually not in front. A driver on a job has Maps open, or the
 *    screen off. So this runs as an OS-level background task with an Android
 *    foreground-service notification, not a `watchPositionAsync` in a screen.
 *  · The task can run in a JS context that has no memory of the app. Android
 *    may relaunch it headless after the process dies, so anything it needs —
 *    which trip, the last fix sent, the unsent backlog — lives in MMKV rather
 *    than in module state, which would silently be empty on that path.
 *  · Coverage is the worst exactly where trucks go. A fix that cannot be sent
 *    is buffered and replayed, because a gap in the trail is precisely what the
 *    customer notices and calls about.
 *
 * If the driver refuses background location the whole thing degrades to a
 * foreground watch rather than failing: tracking while the app is open beats no
 * tracking, and it is the driver's call to make.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

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

const KEY_TRIP = 'tracking.tripId';
const KEY_LAST_FIX = 'tracking.lastFix';
const KEY_BUFFER = 'tracking.buffer';

/**
 * Floor on how often a fix is forwarded. The OS honours `timeInterval` loosely
 * and will hand over a burst after a doze window, so this is what actually
 * bounds the traffic.
 */
const MIN_SEND_INTERVAL_MS = 5000;

/**
 * Ceiling on silence. Past this a fix is sent even if the truck has not moved
 * far enough to clear the displacement gate — a customer watching a stationary
 * marker needs to see it is still *live*, and the server needs a heartbeat to
 * tell "parked" from "phone died".
 */
const HEARTBEAT_MS = 45000;

/**
 * Backlog cap. A driver can be out of coverage for hours; without a cap the
 * buffer grows until MMKV writes start costing real time on every fix. Oldest
 * go first — for a trail being replayed late, recent positions are what matter.
 */
const MAX_BUFFERED_FIXES = 250;

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

// ── Delivery ─────────────────────────────────────────────────

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

/**
 * Applies the send gates and forwards the fix if it clears them.
 *
 * Exported because the background task, the foreground fallback watcher and
 * the tests all need the same decision — duplicating it is how a trail ends up
 * smooth in the foreground and jittery in the background.
 */
async function report(location: Location.LocationObject): Promise<void> {
  const tripId = Preference.raw.getString(KEY_TRIP);
  // No active trip means tracking is winding down; drop rather than buffer, or
  // the next trip opens with a trail from the last one.
  if (!tripId) return;

  const fix: LocationFix = {
    tripId,
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? undefined,
    heading: location.coords.heading ?? undefined,
    speed: location.coords.speed ?? undefined,
    recordedAt: location.timestamp,
  };

  const last = readJson<LocationFix | null>(KEY_LAST_FIX, null);
  if (last && last.tripId === tripId) {
    const elapsed = Date.now() - last.recordedAt;
    const moved = distanceMetres(last, fix);

    if (elapsed < MIN_SEND_INTERVAL_MS) return;
    if (moved < MIN_DISPLACEMENT_METRES && elapsed < HEARTBEAT_MS) return;
  }

  writeJson(KEY_LAST_FIX, fix);
  await deliver(fix);
}

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
  // A doze window releases a batch at once. Only the newest is worth sending —
  // the rest are history the customer's map has already moved past.
  const latest = locations?.[locations.length - 1];
  if (latest) await report(latest);
});

// ── Foreground fallback ──────────────────────────────────────

/** Live only when running without background permission. */
let foregroundWatch: Location.LocationSubscription | null = null;

/**
 * Whether fixes are actually flowing, by either path.
 *
 * The background task's state is owned by the OS and survives the app; the
 * foreground watcher's does not. Checking both is what makes `start` safe to
 * call repeatedly.
 */
async function isStreaming(): Promise<boolean> {
  if (foregroundWatch) return true;
  return await Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false);
}

/**
 * Grants-or-asks, in that order.
 *
 * Requesting a permission that is already granted is harmless, but requesting
 * one that was denied-but-askable re-raises the system dialog — and this runs
 * on every trip refresh. Checking first turns a repeating popup into a no-op.
 */
async function ensureGranted(
  check: () => Promise<{ granted: boolean; canAskAgain: boolean }>,
  request: () => Promise<{ granted: boolean }>,
): Promise<boolean> {
  try {
    const existing = await check();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    return (await request()).granted;
  } catch {
    return false;
  }
}

async function startForegroundWatch(): Promise<void> {
  if (foregroundWatch) return;
  foregroundWatch = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: MIN_SEND_INTERVAL_MS,
      distanceInterval: MIN_DISPLACEMENT_METRES,
    },
    (location) => void report(location),
  );
}

function stopForegroundWatch(): void {
  foregroundWatch?.remove();
  foregroundWatch = null;
}

// ── Duty pings ───────────────────────────────────────────────

/** Live while the driver is on duty but not carrying anything. */
let dutyWatch: Location.LocationSubscription | null = null;

/**
 * How often an idle on-duty driver reports where they are.
 *
 * Far coarser than trip tracking, because nobody is watching a map — this
 * exists so the server can offer work to the drivers nearest a pickup, and put
 * a true "6 min away" on the offer card. Two minutes, or 500 m of movement, is
 * plenty for that and costs almost nothing in battery.
 */
const DUTY_PING_INTERVAL_MS = 120000;
const DUTY_PING_DISPLACEMENT_M = 500;

// ── Public surface ───────────────────────────────────────────

export const LocationTracker = {
  /** The trip currently being tracked, if any. */
  activeTripId: (): string | undefined => Preference.raw.getString(KEY_TRIP),

  /**
   * Begins streaming for `tripId`. Idempotent, and switching trips mid-stream
   * is a supported call — the driver may be handed a second job.
   */
  async start(tripId: string): Promise<void> {
    if (!tripId) return;

    const previous = Preference.raw.getString(KEY_TRIP);

    // Cheap exit when this exact trip is already streaming by either path.
    // `start` is called from every trip-list refresh, and without this the
    // permission requests below would re-run — and re-prompt — every time.
    if (previous === tripId && (await isStreaming())) return;

    if (previous !== tripId) {
      // A new trip starts with a clean slate, so the displacement gate is not
      // measured against a fix from the previous job's drop point.
      Preference.raw.remove(KEY_LAST_FIX);
    }
    Preference.raw.set(KEY_TRIP, tripId);

    const foreground = await ensureGranted(
      Location.getForegroundPermissionsAsync,
      Location.requestForegroundPermissionsAsync,
    );
    if (!foreground) {
      if (__DEV__) console.log('location tracking: foreground permission denied');
      return;
    }

    // Android splits "while using" from "all the time" and only ever grants the
    // latter from a second, separate prompt. Asking is right; refusing is not
    // fatal, it just costs background coverage.
    const background = await ensureGranted(
      Location.getBackgroundPermissionsAsync,
      Location.requestBackgroundPermissionsAsync,
    );

    if (!background) {
      await startForegroundWatch();
      return;
    }

    stopForegroundWatch();
    if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) return;

    await Location.startLocationUpdatesAsync(TASK_NAME, {
      // High rather than BestForNavigation: the extra precision buys nothing on
      // a customer's map at city zoom and costs a great deal of battery over an
      // eight-hour shift.
      accuracy: Location.Accuracy.High,
      timeInterval: MIN_SEND_INTERVAL_MS,
      distanceInterval: MIN_DISPLACEMENT_METRES,
      // Let the OS release a doze-window batch rather than waking the app per
      // fix; `report` keeps only the newest anyway.
      deferredUpdatesInterval: MIN_SEND_INTERVAL_MS,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Trip in progress',
        notificationBody: 'Sharing your location with the customer.',
        notificationColor: '#004B64',
      },
    });
  },

  /**
   * Stops streaming and clears the trip. Any unsent backlog is flushed first —
   * this fires on delivery, which is the moment the tail of the trail matters
   * most and the moment it would otherwise be discarded.
   */
  async stop(): Promise<void> {
    const buffered = readJson<LocationFix[]>(KEY_BUFFER, []);
    if (buffered.length > 0) {
      try {
        await JobRepository.pushLocations(buffered);
        Preference.raw.remove(KEY_BUFFER);
      } catch (e) {
        if (__DEV__) console.log('final location flush failed:', e);
      }
    }

    Preference.raw.remove(KEY_TRIP);
    Preference.raw.remove(KEY_LAST_FIX);

    stopForegroundWatch();
    try {
      if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) {
        await Location.stopLocationUpdatesAsync(TASK_NAME);
      }
    } catch (e) {
      if (__DEV__) console.log('stopLocationUpdates failed:', e);
    }
  },

  /**
   * Reconciles tracking with the trips the driver actually holds.
   *
   * Called after every trip refresh. Without it, tracking outlives its trip in
   * both directions: a delivery completed on another device leaves the service
   * running for hours, and an app restart mid-trip never restarts it.
   *
   * Note it does not compare against the stored trip id and stop there. That
   * id survives a process death but the streaming does not, so "same trip as
   * last time" is not evidence that anything is still running — `start` makes
   * that call properly by asking whether a stream actually exists.
   */
  async sync(activeTripId: string | undefined): Promise<void> {
    if (activeTripId) {
      await LocationTracker.start(activeTripId);
    } else if (Preference.raw.getString(KEY_TRIP)) {
      await LocationTracker.stop();
    }
  },

  /**
   * Starts reporting position while merely on duty.
   *
   * Foreground only, deliberately: an idle driver is carrying nothing, so
   * there is nothing worth a background service and its permanent
   * notification. Trip tracking, which does have to survive a locked screen,
   * is the separate path above.
   *
   * Fixes go out with no tripId — the server stores that as the driver's
   * last-known position and nothing more: no trail row, nothing relayed.
   */
  async startDutyPings(): Promise<void> {
    if (dutyWatch) return;

    const granted = await ensureGranted(
      Location.getForegroundPermissionsAsync,
      Location.requestForegroundPermissionsAsync,
    );
    if (!granted) return;

    dutyWatch = await Location.watchPositionAsync(
      {
        // Balanced, not High: this answers "which part of town", not "which
        // lane", and it runs for a whole shift.
        accuracy: Location.Accuracy.Balanced,
        timeInterval: DUTY_PING_INTERVAL_MS,
        distanceInterval: DUTY_PING_DISPLACEMENT_M,
      },
      (location) => {
        const fix: LocationFix = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
          heading: location.coords.heading ?? undefined,
          speed: location.coords.speed ?? undefined,
          recordedAt: location.timestamp,
        };
        // Sent straight out, with no displacement gate and no buffering: a
        // duty ping that fails is superseded by the next one two minutes
        // later, and a replayed queue of stale ones is worth nothing.
        if (!DispatchSocket.sendLocation(fix)) {
          void JobRepository.pushLocations([fix]).catch(() => {
            /* Offline. The next ping carries the current position. */
          });
        }
      },
    );
  },

  /** Stops duty pings. Duty off and logout. */
  stopDutyPings(): void {
    dutyWatch?.remove();
    dutyWatch = null;
  },

  /** True when the OS-level background task is running. */
  isTracking: async (): Promise<boolean> =>
    Platform.OS === 'web'
      ? false
      : await Location.hasStartedLocationUpdatesAsync(TASK_NAME),
} as const;
