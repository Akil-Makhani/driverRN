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
