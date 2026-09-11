/**
 * A driver position fix, as streamed to the server and relayed to the customer.
 *
 * Field names are chosen to match what `expo-location` hands back so the
 * mapping stays a rename and nothing else, and every optional field is
 * genuinely optional — an Android fix from a cold GPS start routinely has no
 * heading and no speed, and dropping the whole fix over that would blank the
 * customer's map at exactly the moment the trip starts.
 */
export interface LocationFix {
  /** Which trip this position belongs to; absent while merely on duty. */
  tripId?: string;
  latitude: number;
  longitude: number;
  /** Metres of horizontal uncertainty, as reported by the OS. */
  accuracy?: number;
  /** Degrees clockwise from true north — rotates the truck marker. */
  heading?: number;
  /** Metres per second. */
  speed?: number;
  /** When the fix was taken, epoch millis. NOT when it was sent. */
  recordedAt: number;
}

/**
 * Two fixes are "the same place" if they are within this many metres. Below it
 * the movement is GPS jitter, not travel, and forwarding it would make a parked
 * truck wander around the customer's map.
 */
export const MIN_DISPLACEMENT_METRES = 25;

/** Great-circle distance in metres. Haversine; accurate well past truck range. */
export function distanceMetres(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const EARTH_RADIUS_M = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}
