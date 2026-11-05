/**
 * Date of birth: the driver types and reads it as DD-MM-YYYY, the way dates
 * are written in India; the server and ULIP's sarthi-driver lookup take
 * YYYY-MM-DD. The forms keep the DD-MM-YYYY text and convert at the edges.
 */
import { toAsciiDigits } from './number-format';

/** Digits only, dashes added as the driver types: "12051990" -> "12-05-1990". */
export function formatDobInput(raw: string): string {
  const digits = toAsciiDigits(raw).replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

/** "12-05-1990" -> "1990-05-12"; '' while it is incomplete. */
export function dobToIso(display: string): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(display.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

/** "1990-05-12" -> "12-05-1990"; anything else is returned as it is. */
export function dobFromIso(iso: string | null | undefined): string {
  const value = (iso ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : value;
}
