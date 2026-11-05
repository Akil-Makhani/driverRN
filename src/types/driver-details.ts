/**
 * Tiles Drop "Complete your details". A driver registers with the vehicle
 * number and tempo capacity only; the name, licence number, date of birth and
 * the four document photos follow from the app, before the admin's trip limit
 * (Tempo App Setting) makes them compulsory. Past that limit with anything
 * missing, the driver gets no new trips (`blocked`).
 */
import { num, str } from './api';
import { REGISTRATION_DOCUMENT_KEYS, type RegistrationDocumentKey } from './registration';

/** Where the driver stands; mirrors driverDetails.service.ts on the API. */
export interface DriverDetailsStatus {
  complete: boolean;
  /** driverName, driverLicenceNumber, dob, dlFront, dlBack, rcFront, rcBack. */
  missing: string[];
  completedTrips: number;
  /** Null when the admin set no limit. */
  tripLimit: number | null;
  /** Trips left before the details are compulsory; null without a limit. */
  tripsLeft: number | null;
  /** No new trips until the details are filled in. */
  blocked: boolean;
}

export function parseDriverDetailsStatus(json: any): DriverDetailsStatus | null {
  if (!json || typeof json !== 'object') return null;
  const limit = json.tripLimit == null ? null : num(json.tripLimit) ?? null;
  const left = json.tripsLeft == null ? null : num(json.tripsLeft) ?? null;
  return {
    complete: json.complete === true,
    missing: Array.isArray(json.missing) ? json.missing.map(String) : [],
    completedTrips: num(json.completedTrips) ?? 0,
    tripLimit: limit,
    tripsLeft: left,
    blocked: json.blocked === true,
  };
}

/** One document photo on file: its key and a link to show it. */
export interface DriverDocumentPhoto {
  fileKey: string;
  url?: string;
}

/** GET /driver/account/details. */
export interface DriverDetails {
  driverName: string;
  vehicleNumber: string;
  vehicleCapacity: number | null;
  driverLicenceNumber: string;
  dob: string;
  documents: Partial<Record<RegistrationDocumentKey, DriverDocumentPhoto>>;
  status: DriverDetailsStatus | null;
}

export function parseDriverDetails(json: any): DriverDetails | null {
  const d = json?.data;
  if (!d || typeof d !== 'object') return null;
  const documents: DriverDetails['documents'] = {};
  for (const key of REGISTRATION_DOCUMENT_KEYS) {
    const photo = d.documents?.[key];
    if (photo?.fileKey) documents[key] = { fileKey: String(photo.fileKey), url: str(photo.url) };
  }
  return {
    driverName: str(d.driverName) ?? '',
    vehicleNumber: str(d.vehicleNumber) ?? '',
    vehicleCapacity: d.vehicleCapacity == null ? null : num(d.vehicleCapacity) ?? null,
    driverLicenceNumber: str(d.driverLicenceNumber) ?? '',
    dob: str(d.dob) ?? '',
    documents,
    status: parseDriverDetailsStatus(d.status),
  };
}
