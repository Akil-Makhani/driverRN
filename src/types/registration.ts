/**
 * Types for the pre-account registration flow (POST /driver/registration and
 * friends). Everything here describes a driver who does *not* have an account
 * yet, which is why none of it overlaps with AppUser in ./user.ts — that only
 * exists once the admin has approved them and they have logged in.
 */
import { type Envelope, str } from './api';

/** Mirrors the `status` enum on the backend's appdriver collection. */
export type RegistrationStatus = 'Pending' | 'Approved' | 'Rejected';

/** Mapped `vahan` response — the subset the form shows back to the driver. */
export interface VehicleInfo {
  ownerName?: string;
  vehicleNumber?: string;
  makerModel?: string;
  vehicleClass?: string;
  fuelType?: string;
  color?: string;
  registrationDate?: string;
  fitnessUpto?: string;
  insuranceUpto?: string;
  insuranceCompany?: string;
  puccUpto?: string;
  status?: string;
}

/** Mapped `sarthi-driver` response. */
export interface DriverLicenceInfo {
  name?: string;
  dlNumber?: string;
  status?: string;
  validFrom?: string;
  validUpto?: string;
  issueDate?: string;
  rtoOffice?: string;
  state?: string;
  vehicleClasses?: string;
  gender?: string;
  bloodGroup?: string;
  dob?: string;
}

/** What GET /driver/registration/status answers with. */
export interface RegistrationStatusInfo {
  status: RegistrationStatus;
  rejectionReason?: string;
  vehicleNumber?: string;
  driverLicenceNumber?: string;
  driverName?: string;
  submittedAt?: string;
  decidedAt?: string;
  /**
   * False for a registration that is still only a verified mobile number —
   * the driver skipped the details step. It is Pending like any other, but
   * nothing has been sent for review, so the waiting screen asks for the rest
   * instead of promising a decision. Absent on records that predate the skip
   * flow, which is why {@link isRegistrationComplete} falls back to reading
   * the fields themselves rather than trusting this alone.
   */
  isComplete?: boolean;
}

/**
 * Whether a registration carries enough for an admin to decide on. The server
 * flag is the authority when it sends one; without it, a record holding both
 * a vehicle and a licence is one that came through the full form.
 */
export function isRegistrationComplete(
  info: RegistrationStatusInfo | null | undefined,
): boolean {
  if (!info) return false;
  if (typeof info.isComplete === 'boolean') return info.isComplete;
  // A vehicle is all registration needs now; the rest can follow later.
  return Boolean(info.vehicleNumber);
}

export function parseVehicleInfo(json: any): VehicleInfo | null {
  if (!json || typeof json !== 'object') return null;
  return {
    ownerName: str(json.ownerName),
    vehicleNumber: str(json.vehicleNumber),
    makerModel: str(json.makerModel),
    vehicleClass: str(json.vehicleClass),
    fuelType: str(json.fuelType),
    color: str(json.color),
    registrationDate: str(json.registrationDate),
    fitnessUpto: str(json.fitnessUpto),
    insuranceUpto: str(json.insuranceUpto),
    insuranceCompany: str(json.insuranceCompany),
    puccUpto: str(json.puccUpto),
    status: str(json.status),
  };
}

export function parseDriverLicenceInfo(json: any): DriverLicenceInfo | null {
  if (!json || typeof json !== 'object') return null;
  return {
    name: str(json.name),
    dlNumber: str(json.dlNumber),
    status: str(json.status),
    validFrom: str(json.validFrom),
    validUpto: str(json.validUpto),
    issueDate: str(json.issueDate),
    rtoOffice: str(json.rtoOffice),
    state: str(json.state),
    vehicleClasses: str(json.vehicleClasses),
    gender: str(json.gender),
    bloodGroup: str(json.bloodGroup),
    dob: str(json.dob),
  };
}

/**
 * A driver who has never registered is a `null` data payload, not an error, so
 * "no record" and "record found" are both success responses here.
 */
export function parseRegistrationStatus(json: any): RegistrationStatusInfo | null {
  const d = json?.data;
  if (!d || typeof d !== 'object' || !d.status) return null;
  return {
    status: d.status as RegistrationStatus,
    rejectionReason: str(d.rejectionReason) || undefined,
    vehicleNumber: str(d.vehicleNumber),
    driverLicenceNumber: str(d.driverLicenceNumber),
    driverName: str(d.driverName) || undefined,
    submittedAt: str(d.submittedAt),
    decidedAt: str(d.decidedAt),
    // Only carried through when the server actually said something: an absent
    // flag has to stay absent so the field-based fallback can take over.
    ...(typeof d.isComplete === 'boolean' ? { isComplete: d.isComplete } : {}),
  };
}

/**
 * What the details step of a registration sends. Split out from the mobile
 * number because the two now go up separately: the number is filed the moment
 * its OTP verifies, and these follow whenever the driver gets round to them.
 */
export type RegistrationDetails = Omit<RegistrationForm, 'mobileNo'>;

/**
 * The four document photos a driver can add. The names match the
 * `documents` object on the backend's appdriver record.
 */
export const REGISTRATION_DOCUMENT_KEYS = ['dlFront', 'dlBack', 'rcFront', 'rcBack'] as const;
export type RegistrationDocumentKey = (typeof REGISTRATION_DOCUMENT_KEYS)[number];
/**
 * Every photo the form can carry: the four documents plus the driver's own
 * photo, which is optional and goes up as `profilePhoto` beside `documents`.
 */
export type RegistrationPhotoKey = RegistrationDocumentKey | 'profilePhoto';
/** S3 keys of the uploaded photos, as the server hands them back. */
export type RegistrationDocuments = Partial<Record<RegistrationPhotoKey, string>>;

/**
 * Fields the registration form collects. Only the vehicle number and the tempo
 * capacity are required (the mobile number is proved by OTP); the rest may be
 * filled in later from the app's "Complete your details" screen, before the
 * admin's trip limit makes them compulsory.
 */
export interface RegistrationForm {
  driverName: string;
  mobileNo: string;
  vehicleNumber: string;
  /** What the tempo can carry, in KG, as typed (digits only). */
  vehicleCapacity: string;
  driverLicenceNumber: string;
  /** As typed, DD-MM-YYYY; sent to the server as YYYY-MM-DD (core/utils/dob). */
  dob: string;
  /** All optional; filled in by the store as each upload lands. */
  documents: RegistrationDocuments;
}

export type RegistrationStatusResponse = Envelope<RegistrationStatusInfo>;

/**
 * What a rejected registration carried, handed back by verify-otp (and only
 * there, after the OTP) so registering again starts from a filled-in form.
 */
export interface PreviousRegistration {
  driverName: string;
  vehicleNumber: string;
  /** KG, as a string for the form; '' when the old record had none. */
  vehicleCapacity: string;
  driverLicenceNumber: string;
  dob: string;
  /** Photos already uploaded: their S3 key and a link to show them. */
  photos: Partial<Record<RegistrationPhotoKey, { fileKey: string; url?: string }>>;
}

export function parsePreviousRegistration(json: any): PreviousRegistration | null {
  if (!json || typeof json !== 'object') return null;
  const photos: PreviousRegistration['photos'] = {};
  const keys: RegistrationPhotoKey[] = [...REGISTRATION_DOCUMENT_KEYS, 'profilePhoto'];
  for (const key of keys) {
    const photo = json.photos?.[key];
    if (photo?.fileKey) photos[key] = { fileKey: String(photo.fileKey), url: str(photo.url) };
  }
  return {
    driverName: str(json.driverName) ?? '',
    vehicleNumber: str(json.vehicleNumber) ?? '',
    vehicleCapacity: json.vehicleCapacity != null ? String(json.vehicleCapacity) : '',
    driverLicenceNumber: str(json.driverLicenceNumber) ?? '',
    dob: str(json.dob) ?? '',
    photos,
  };
}
