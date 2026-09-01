/**
 * Google Maps deep links for trip routing.
 *
 * The driver API does not return coordinates: pickup and delivery addresses
 * come back as components only (buildingName / locality / city / pincode).
 * Flutter's "GET DIRECTION" button gated on `latitude != null && longitude
 * != null`, so it never actually rendered. These helpers therefore build the
 * link from whatever is present — coordinates when the backend starts sending
 * them, formatted address text otherwise, which Maps geocodes server-side.
 */
import * as Location from 'expo-location';
import { Linking } from 'react-native';

import type { Address } from '@/types/trip';

/** True when the address carries usable coordinates. */
function hasCoordinates(address?: Address | null): boolean {
  return Boolean(address?.latitude && address?.longitude);
}

/**
 * A single Maps query term for an address: "lat,lng" when coordinates exist,
 * otherwise the comma-joined components. Empty when there is nothing to go on.
 */
export function addressQuery(address?: Address | null): string {
  if (!address) return '';
  if (hasCoordinates(address)) return `${address.latitude},${address.longitude}`;

  // Ordered narrow → broad so Maps disambiguates correctly; blanks dropped.
  return [
    address.companyName,
    address.buildingName,
    address.locality,
    address.landmark,
    address.city,
    address.pincode,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');
}

/**
 * Whether a route can be drawn. Only the destination matters — the origin is
 * the driver's live location, which Maps always supplies.
 */
export function canShowRoute(destination?: Address | null): boolean {
  return addressQuery(destination).length > 0;
}

/**
 * Asks for foreground location before routing.
 *
 * Google Maps resolves "my location" through its own permission, so a route
 * still opens if this is denied — but asking first lets the app say why the
 * blue dot is missing instead of silently handing over a route with no start
 * point. Returns false only when the driver actively refuses.
 */
export async function ensureLocationPermission(): Promise<boolean> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return true;
  // Denied-and-not-askable: the OS will not show a dialog again, so treat it
  // as a refusal the caller can explain rather than prompting into the void.
  if (!existing.canAskAgain) return false;

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.granted;
}

/**
 * Opens Google Maps with turn-by-turn driving directions to `destination`.
 *
 * `origin` is deliberately optional and normally omitted: leaving it out makes
 * Maps route from the driver's live GPS position, which is what a driver
 * actually needs and keeps the app free of a location permission. Pass one
 * only to show a fixed leg (e.g. previewing pickup → delivery).
 */
export async function openRoute(
  destination?: Address | null,
  origin?: Address | null,
): Promise<void> {
  const to = addressQuery(destination);
  if (!to) return;

  const params = new URLSearchParams({
    api: '1',
    destination: to,
    travelmode: 'driving',
  });
  const from = addressQuery(origin);
  if (from) params.set('origin', from);

  await Linking.openURL(`https://www.google.com/maps/dir/?${params.toString()}`);
}

/**
 * The address the driver should be heading to right now.
 *
 * Up to and including loading at the pickup site (statusNumber 1-3) that is the
 * pickup; once the load is in transit (4+) it is the delivery address.
 */
export function activeDestination(trip?: {
  statusNumber?: number;
  pickupAddress?: Address;
  deliveries?: { address?: Address }[];
} | null): Address | undefined {
  if (!trip) return undefined;
  const headingToDelivery = (trip.statusNumber ?? 1) >= 4;
  return headingToDelivery ? trip.deliveries?.[0]?.address : trip.pickupAddress;
}

/** Opens Maps centred on a single address (no route). */
export async function openLocation(address?: Address | null): Promise<void> {
  const query = addressQuery(address);
  if (!query) return;
  const params = new URLSearchParams({ api: '1', query });
  await Linking.openURL(`https://www.google.com/maps/search/?${params.toString()}`);
}
