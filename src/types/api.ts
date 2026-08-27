/**
 * Shared response envelope. Every BST endpoint answers
 * `{ status, message, data }`, which Dart re-declared on each response class.
 */
export interface CommonResponse {
  status?: string;
  message?: string;
}

export interface Envelope<T> extends CommonResponse {
  data?: T | null;
}

/** The API signals success with the string "success", not an HTTP-only code. */
export const isSuccess = (r?: CommonResponse | null): boolean =>
  r?.status === 'success';

// ── Parsing helpers ──────────────────────────────────────────
// The API is loose about numeric types (weights arrive as both 12 and "12"),
// so every numeric field goes through these rather than a bare cast.

export function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function str(v: unknown): string | undefined {
  return v == null ? undefined : String(v);
}

/** Map a JSON array through a parser, tolerating null/non-array values. */
export function list<T>(v: unknown, parse: (raw: any) => T): T[] {
  return Array.isArray(v) ? v.map(parse) : [];
}
