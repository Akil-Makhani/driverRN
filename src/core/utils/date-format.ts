/**
 * Replaces Dart's `DateFormat('h:mm a d MMM yyyy')` from package:intl, used by
 * the notification and trip-history models to render `createdAt`/`updatedAt`.
 *
 * Bringing in a date library for one format would be overkill; Intl is built
 * into Hermes. `formatMatchToParts` is avoided because the exact ordering
 * ("7:05 PM 3 Feb 2026") does not correspond to any single locale pattern, so
 * the parts are assembled by hand.
 */
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * "h:mm a d MMM yyyy" in the device's local zone, e.g. "7:05 PM 3 Feb 2026".
 * Returns undefined for a null/unparseable input, matching the Dart guard
 * that only formatted when the field was non-null.
 */
export function formatTimestamp(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;

  const hours24 = d.getHours();
  const period = hours24 < 12 ? 'AM' : 'PM';
  // 0 → 12, 13 → 1. Dart's `h` is 1..12.
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hours12}:${minutes} ${period} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
