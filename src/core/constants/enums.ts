/**
 * 1:1 port of lib/utility/common_enum.dart.
 *
 * Flutter's enums carried a `displayString` extension holding the wire value.
 * TS string-literal unions do that directly — the constant IS the wire value,
 * so no mapping table is needed and the compiler checks call sites.
 */

/** TripStatus.displayString — the `status` path segment sent to the API. */
export const TripStatus = {
  rejected: 'rejected',
  accepted: 'accepted',
  pickup: 'pickedUp',
  inTransit: 'inTransit',
  delivered: 'delivered',
} as const;

export type TripStatusValue = (typeof TripStatus)[keyof typeof TripStatus];

/** DocumentType.displayString — the `documentType` field on upload-url calls. */
export const DocumentType = {
  weightSlip: 'weight_slip',
  invoice: 'invoice',
} as const;

export type DocumentTypeValue =
  (typeof DocumentType)[keyof typeof DocumentType];

/**
 * Trip lifecycle as the API numbers it (`statusNumber`), which drives both the
 * progress tracker and which bottom action bar renders.
 *   1 assigned (not yet accepted) · 2 accepted · 3 at pickup
 *   4 in transit · 5 delivered
 */
export const TripStatusNumber = {
  assigned: 1,
  accepted: 2,
  pickup: 3,
  inTransit: 4,
  delivered: 5,
} as const;
