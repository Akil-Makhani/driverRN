/**
 * Decoder for Google's encoded-polyline format.
 *
 * Written here rather than pulled in as a dependency: the algorithm is twenty
 * lines and stable since 2006, and the packages that wrap it are unmaintained
 * or ship a whole geometry toolkit for this one function.
 *
 * The server sends routes in this format from either Google Routes or OSRM —
 * both emit the same 5-decimal-place encoding, so one decoder serves both.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Encoded polyline → coordinates.
 *
 * Returns an empty array for anything unparseable rather than throwing: this
 * runs while drawing an offer card the driver has seconds to read, and a
 * malformed route should cost them the line on the map, not the whole card.
 */
export function decodePolyline(encoded?: string | null): LatLng[] {
  if (!encoded) return [];

  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  try {
    while (index < encoded.length) {
      // Each coordinate is a zig-zag-encoded delta from the previous one, in
      // 5-bit chunks with the high bit set on every chunk but the last.
      let result = 0;
      let shift = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      lat += result & 1 ? ~(result >> 1) : result >> 1;

      result = 0;
      shift = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      lng += result & 1 ? ~(result >> 1) : result >> 1;

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
  } catch {
    return points;
  }

  return points;
}

/**
 * A map region that fits every point, with a little air around it.
 *
 * Returns null for an empty list so the caller can fall back to its own
 * centring rather than being handed a region at 0°N 0°E.
 */
export function regionForPoints(
  points: LatLng[],
  paddingRatio = 0.25,
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null {
  if (!points.length) return null;

  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }

  // A floor on the span, so a very short trip does not zoom to street level
  // where the whole route is one indistinguishable blob.
  const latDelta = Math.max((maxLat - minLat) * (1 + paddingRatio), 0.01);
  const lngDelta = Math.max((maxLng - minLng) * (1 + paddingRatio), 0.01);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}
