/** Port of lib/screens/login_otp/model/user.dart. */
import { Envelope, num, str } from './api';

export interface AppUser {
  id: string;
  name: string;
  mobileNumber: string;
  adharNumber: string;
  panNumber: string;
  dutyStatus: string;
  /** 'en' | 'hi' | 'gu' — absent from an API that predates languages. */
  language?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  accessToken: string;
  refreshToken: string;
  tripCount?: number;
  completedTripCount?: number;
  /** The admin turned the Test location screen on for this driver. */
  testLocationAccess: boolean;
  /** A signed link to the driver's photo; absent when none was uploaded. */
  profilePhotoUrl?: string;
  /** The tempo / truck number the driver is registered with. */
  vehicleNumber?: string;
  driverLicenceNumber?: string;
  /** 'YYYY-MM-DD', as registered. */
  dob?: string;
}

export function parseAppUser(json: any): AppUser {
  return {
    id: json?._id ?? '',
    name: json?.name ?? '',
    mobileNumber: json?.mobileNumber ?? '',
    adharNumber: json?.adharNumber ?? '',
    panNumber: json?.panNumber ?? '',
    dutyStatus: json?.dutyStatus ?? '',
    language: str(json?.language),
    status: json?.status ?? '',
    // Dart parsed these into DateTime but never formatted them; keeping the
    // raw ISO string avoids a conversion nothing consumes.
    createdAt: str(json?.createdAt),
    updatedAt: str(json?.updatedAt),
    accessToken: json?.accessToken ?? '',
    refreshToken: json?.refreshToken ?? '',
    tripCount: num(json?.tripCount),
    completedTripCount: num(json?.completedTripCount),
    // Absent on every driver the admin has not switched on, and on an API
    // that predates the switch: both mean no.
    testLocationAccess: json?.testLocationAccess === true,
    profilePhotoUrl: str(json?.profilePhotoUrl),
    vehicleNumber: str(json?.vehicleNumber),
    // Market drivers carry driverLicenceNumber; own drivers, licenceNumber.
    driverLicenceNumber: str(json?.driverLicenceNumber ?? json?.licenceNumber),
    dob: str(json?.dob),
  };
}

export type UserResponse = Envelope<AppUser>;

export function parseUserResponse(json: any): UserResponse {
  return {
    status: json?.status,
    message: json?.message,
    data: json?.data ? parseAppUser(json.data) : null,
  };
}

/**
 * Port of duty_status_change_response.dart. Dart declared a second `User`
 * class identical to AppUser for this one endpoint; it parses the same shape,
 * so it reuses AppUser here.
 */
export type DutyStatusChangeResponse = Envelope<AppUser>;

export const parseDutyStatusChangeResponse = parseUserResponse;
