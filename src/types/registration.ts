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
  };
}

/** Fields the registration form collects. */
export interface RegistrationForm {
  driverName: string;
  mobileNo: string;
  vehicleNumber: string;
  driverLicenceNumber: string;
  /** Always 'YYYY-MM-DD' — the format ULIP's sarthi-driver requires. */
  dob: string;
}

export type RegistrationStatusResponse = Envelope<RegistrationStatusInfo>;
