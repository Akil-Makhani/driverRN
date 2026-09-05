/**
 * Logs the driver's position to the API roughly every 10 minutes while they
 * are on duty.
 *
 * Runs as a native background task, not a JS timer. Android suspends JS timers
 * as soon as the app is backgrounded, and a driver spends most of a trip with
 * the phone pocketed or cradled and the screen off — a foreground-only timer
 * would capture a few points around app opens and miss the whole journey.
 *
 * Pings are queued in MMKV before being sent and cleared only once the server
 * accepts them, so a dead zone on a highway run costs nothing: the queue
 * flushes on the next successful call.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState, type AppStateStatus } from 'react-native';

import { ApiService } from '../api/api-service';
import { ApiUrls } from '../api/endpoints';
import { Preference } from '../storage/preference';

/** How often to take a fix. */
const INTERVAL_MS = 10 * 60 * 1000;

/** Cap on the offline backlog. Oldest pings are dropped first. */
const MAX_QUEUE = 100;

const QUEUE_KEY = 'pending_locations';
const TRIP_KEY = 'tracking_current_trip';
export const LOCATION_TASK = 'bst-driver-location-task';

export interface LocationPing {
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

// ── Queue ────────────────────────────────────────────────────

function readQueue(): LocationPing[] {
  try {
    const raw = Preference.raw.getString(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as LocationPing[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(pings: LocationPing[]): void {
  try {
    // Keep the newest MAX_QUEUE: on a long outage recent positions matter more
    // than stale ones, and an unbounded queue would grow without limit.
    Preference.raw.set(QUEUE_KEY, JSON.stringify(pings.slice(-MAX_QUEUE)));
  } catch {
    // A failed write costs one ping; never break tracking over it.
  }
}

/**
 * The trip in progress, persisted rather than held in memory: the background
 * task runs in a separate JS context that does not share the app's stores, so
 * an in-memory provider would read as null there.
 */
function readCurrentTrip(): { tripId?: string; statusNumber?: number } | null {
  try {
    const raw = Preference.raw.getString(TRIP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentTrip(
  trip: { tripId?: string; statusNumber?: number } | null,
): void {
  try {
    if (trip?.tripId) Preference.raw.set(TRIP_KEY, JSON.stringify(trip));
    else Preference.raw.remove(TRIP_KEY);
  } catch {
    // Losing the tag only means the ping is stored unattached to a trip.
  }
}

// ── Sending ──────────────────────────────────────────────────

/**
 * Sends everything queued. On failure the queue is left untouched so the next
 * attempt retries it — the entire point of queueing first.
 */
export async function flush(): Promise<void> {
  const queued = readQueue();
  if (queued.length === 0) return;

  try {
    await ApiService.post(ApiUrls.logLocation, { locations: queued });
    // Re-read rather than assuming: a ping may have arrived while the request
    // was in flight, and blindly clearing would discard it.
    const after = readQueue();
    writeQueue(after.slice(queued.length));
  } catch (e) {
    if (__DEV__) console.log('Location flush failed, will retry:', e);
  }
}

/** Queues a fix and tries to send. Shared by the task and manual captures. */
async function recordPosition(
  coords: Location.LocationObjectCoords,
  timestamp: number,
  source: LocationPing['source'],
): Promise<void> {
  const trip = readCurrentTrip();
  const ping: LocationPing = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    speed: coords.speed,
    heading: coords.heading,
    altitude: coords.altitude,
    tripId: trip?.tripId ?? null,
    tripStatusNumber: trip?.statusNumber ?? null,
    // The device's own clock: when pings flush late, this is the time that
    // actually describes where the driver was.
    recordedAt: new Date(timestamp).toISOString(),
    source,
  };

  writeQueue([...readQueue(), ping]);
  await flush();
}

// ── Background task ──────────────────────────────────────────

/**
 * Registered at module scope so the native side can find it after the app is
 * killed and relaunched — a task defined inside a component would not exist
 * yet when the OS delivers an update.
 */
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    if (__DEV__) console.log('Location task error:', error);
    return;
  }
  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  const position = locations?.[locations.length - 1];
  if (!position) return;

  await recordPosition(position.coords, position.timestamp, 'interval');
});

// ── Control ──────────────────────────────────────────────────

let appStateSub: { remove: () => void } | null = null;

/**
 * Starts background tracking. Safe to call repeatedly — an already-running
 * task is left alone rather than restarted.
 *
 * Returns false when background permission was refused; foreground pings still
 * work in that case, they simply stop when the app is backgrounded.
 */
export async function startTracking(): Promise<boolean> {
  try {
    const foreground = await Location.getForegroundPermissionsAsync();
    if (!foreground.granted) return false;

    // Drain anything queued whenever the app comes forward, independent of the
    // task, so a backlog clears as soon as there is connectivity.
    appStateSub?.remove();
    appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void flush();
    });

    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) return true;

    // Background permission is requested only here, after the driver has gone
    // on duty — asking at launch, with no context, gets refused.
    const background = await Location.requestBackgroundPermissionsAsync();
    if (!background.granted) {
      // Take one fix now so going on duty still records something.
      await captureOnce('status-change');
      return false;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: INTERVAL_MS,
      // Android may coalesce updates to save battery; without a distance floor
      // a stationary phone would still wake the task on every interval.
      distanceInterval: 50,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: 'BST Driver',
        notificationBody: 'Logging your location while you are on duty',
        notificationColor: '#004B64',
      },
    });
    return true;
  } catch (e) {
    if (__DEV__) console.log('startTracking failed:', e);
    return false;
  }
}

/** Stops the task. Queued pings survive for the next start. */
export async function stopTracking(): Promise<void> {
  try {
    appStateSub?.remove();
    appStateSub = null;
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch (e) {
    if (__DEV__) console.log('stopTracking failed:', e);
  }
}

/** Takes a fix immediately, outside the interval. */
export async function captureOnce(
  source: LocationPing['source'] = 'manual',
): Promise<void> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await recordPosition(position.coords, position.timestamp, source);
  } catch (e) {
    if (__DEV__) console.log('Location capture failed:', e);
  }
}

export const LocationTracker = {
  start: startTracking,
  stop: stopTracking,
  captureOnce,
  flush,
  setCurrentTrip,
  /** Pending count — useful when a driver reports missing pings. */
  pendingCount: () => readQueue().length,
  isTracking: () => Location.hasStartedLocationUpdatesAsync(LOCATION_TASK),
} as const;
