/** Port of lib/screens/login_otp/model/user.dart. */
import { Envelope, num, str } from './api';

export interface AppUser {
  id: string;
  name: string;
  mobileNumber: string;
  adharNumber: string;
  panNumber: string;
  dutyStatus: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  accessToken: string;
  refreshToken: string;
  tripCount?: number;
  completedTripCount?: number;
}

export function parseAppUser(json: any): AppUser {
  return {
    id: json?._id ?? '',
    name: json?.name ?? '',
    mobileNumber: json?.mobileNumber ?? '',
    adharNumber: json?.adharNumber ?? '',
    panNumber: json?.panNumber ?? '',
    dutyStatus: json?.dutyStatus ?? '',
    status: json?.status ?? '',
    // Dart parsed these into DateTime but never formatted them; keeping the
    // raw ISO string avoids a conversion nothing consumes.
    createdAt: str(json?.createdAt),
    updatedAt: str(json?.updatedAt),
    accessToken: json?.accessToken ?? '',
    refreshToken: json?.refreshToken ?? '',
    tripCount: num(json?.tripCount),
    completedTripCount: num(json?.completedTripCount),
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
