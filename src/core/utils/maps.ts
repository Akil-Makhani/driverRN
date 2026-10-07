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

/**
 * BST's Morbi godown, where every tempo "godown" order is delivered, as Google
 * Maps lists it. Neither name the office uses finds it: "ALWAYS ROADWAYS PVT
 * LTD, 8-A National Highway" does not geocode, older orders still say
 * "Tazmahal, PWPJ+4M4", and the stored gate coordinates resolve to the
 * neighbouring "Shree Gopal Metals". Only the map link changes; the address the
 * app shows stays exactly as the office entered it.
 */
const GODOWN_MAPS = {
  query: 'Allways Roadways, Lalpar, Morbi, Gujarat 363642',
  placeId: 'ChIJz-TZn0WRWTkRGlEmPhNR18U',
};

function isGodown(address?: Address | null): boolean {
  const company = address?.companyName?.trim().toUpperCase() ?? '';
  if (company.startsWith('ALWAYS ROADWAYS') || company.startsWith('ALLWAYS ROADWAYS')) return true;
  return company === 'TAZMAHAL' && Boolean(address?.buildingName?.toUpperCase().includes('PWPJ+4M4'));
}

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
  if (isGodown(address)) return GODOWN_MAPS.query;
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
    // Ask Maps to open straight into navigation. Without it, `travelmode` is
    // only a hint: when Maps cannot resolve a driving route immediately it
    // falls back to whichever tab it can render (Public transport, typically),
    // which is not what a truck driver needs.
    dir_action: 'navigate',
  });
  if (isGodown(destination)) params.set('destination_place_id', GODOWN_MAPS.placeId);
  const from = addressQuery(origin);
  if (from) params.set('origin', from);
  if (isGodown(origin)) params.set('origin_place_id', GODOWN_MAPS.placeId);

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
  if (isGodown(address)) params.set('query_place_id', GODOWN_MAPS.placeId);
  await Linking.openURL(`https://www.google.com/maps/search/?${params.toString()}`);
}

/**
 * The headline for an address in a list or card — the name a driver recognises.
 *
 * Falls back down the specificity ladder rather than rendering an empty row:
 * an offer that shows a blank pickup is worse than one showing just the city.
 */
export function addressTitle(address?: Address | null): string {
  if (!address) return '';
  return (
    address.companyName?.trim() ||
    address.buildingName?.trim() ||
    address.locality?.trim() ||
    address.city?.trim() ||
    ''
  );
}

/**
 * The supporting line beneath `addressTitle`, with whatever the title already
 * used removed so the two do not repeat the same words.
 */
export function addressSubtitle(address?: Address | null): string {
  if (!address) return '';
  const title = addressTitle(address);
  return [address.buildingName, address.locality, address.city, address.pincode]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part) && part !== title)
    .join(', ');
}
