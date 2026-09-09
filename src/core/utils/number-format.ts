/**
 * Port of lib/common/view/number_space_formatter.dart.
 *
 * Flutter installed a TextInputFormatter on the field; RN has no such hook, so
 * the screen formats in onChangeText and keeps the digits in the store. The
 * pair of functions is the whole contract: strip to digits for the API, group
 * for display.
 */

/** "12345 67890" → "1234567890", capped at maxDigits. */
export function digitsOnly(value: string, maxDigits = 10): string {
  return value.replace(/\D/g, '').slice(0, maxDigits);
}

/**
 * Groups digits for display: "1234567890" → "12345 67890".
 * Default grouping matches the Flutter formatter (10 digits, groups of 5).
 */
export function groupDigits(
  value: string,
  { maxDigits = 10, groupSize = 5, separator = ' ' } = {},
): string {
  const digits = digitsOnly(value, maxDigits);
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += groupSize) {
    groups.push(digits.slice(i, i + groupSize));
  }
  return groups.join(separator);
}

/**
 * Indian digit grouping: 1250 → "1,250", 125000 → "1,25,000".
 *
 * Hand-rolled rather than `toLocaleString('en-IN')` because Hermes ships Intl
 * with a variable ICU footprint across platforms, and a payout silently
 * rendering as "125000" on one device is exactly the kind of thing a driver
 * misreads at a glance. Fractions are dropped — every amount here is rupees.
 */
export function formatRupees(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '0';

  const negative = value < 0;
  const digits = String(Math.trunc(Math.abs(value)));

  // The last three digits stand alone; everything above them groups in twos.
  const tail = digits.slice(-3);
  const head = digits.slice(0, -3);
  const grouped = head
    ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${tail}`
    : tail;

  return negative ? `-${grouped}` : grouped;
}

/** "14.2" for a distance in km; whole numbers stay whole ("9" not "9.0"). */
export function formatKm(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * A driving time a driver reads at a glance: "6 min", "21 mins", "1 hr 10 min".
 *
 * Rounds up, never down — a driver who arrives early is fine, one who is late
 * because the card promised less is not. Under a minute still reads "1 min"
 * rather than "0 min", which looks broken.
 */
export function formatMinutes(value?: number | null): string {
  if (value == null || !Number.isFinite(value) || value < 0) return '';

  const total = Math.max(1, Math.ceil(value));
  if (total < 60) return `${total} ${total === 1 ? 'min' : 'mins'}`;

  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const hourPart = `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  return minutes ? `${hourPart} ${minutes} min` : hourPart;
}
