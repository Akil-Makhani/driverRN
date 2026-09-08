/**
 * The pre-account half of UserRepository: everything a driver can do before
 * they have a login. Nothing here touches the session or the stored tokens,
 * because a driver at this stage has neither — which mobile number is awaiting
 * a decision is the store's business, and the one thing this file does read
 * from storage is the device secret, because that is part of the request body
 * rather than something the caller should have to know about.
 */
import messaging from '@react-native-firebase/messaging';

import { ApiService } from '../api/api-service';
import { ApiUrls } from '../api/endpoints';
import { Preference } from '../storage/preference';
import type { CommonResponse } from '@/types/api';
import {
  type DriverLicenceInfo,
  type RegistrationForm,
  type RegistrationStatusInfo,
  type VehicleInfo,
  parseDriverLicenceInfo,
  parseRegistrationStatus,
  parseVehicleInfo,
} from '@/types/registration';

export const RegistrationRepository = {
  /**
   * Sends the registration OTP. UserRepository.sendLoginOTP cannot stand in
   * for this: it answers 404 for a number with no Driver account, which is
   * every driver arriving here.
   */
  async sendOtp(mobileNo: string): Promise<CommonResponse> {
    return await ApiService.post(ApiUrls.registerSendOtp, { mobileNumber: mobileNo });
  },

  /**
   * Verifies that OTP and, in the same answer, reports where this number
   * already stands — so the app can go straight to a blank form, a
   * resubmission, or the waiting popup without a second round trip.
   */
  async verifyOtp(
    mobileNo: string,
    otp: string,
  ): Promise<RegistrationStatusInfo | null> {
    const raw = await ApiService.post(ApiUrls.registerVerifyOtp, {
      mobileNumber: mobileNo,
      otp,
    });
    // The envelope nests it one deeper than the status endpoint does.
    return parseRegistrationStatus({ data: raw?.data?.registration });
  },

  /**
   * Submits the form. The FCM token rides along so the backend can push the
   * admin's decision straight to this device — there is no Driver record to
   * look a token up on until the driver is approved. A device that refused
   * notification permission simply sends no token, exactly as verifyOTP does.
   */
  async register(form: RegistrationForm): Promise<CommonResponse> {
    let fcmToken: string | null = null;
    try {
      fcmToken = await messaging().getToken();
    } catch (e) {
      if (__DEV__) console.log('Error getting FCM token:', e);
    }

    const body: Record<string, unknown> = {
      driverName: form.driverName.trim(),
      mobileNo: form.mobileNo.trim(),
      vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
      driverLicenceNumber: form.driverLicenceNumber.trim(),
      dob: form.dob.trim(),
      // Sent once, here, and traded back for a session the moment the admin
      // approves — which is what lets approval open the app instead of asking
      // for a login OTP on the number this form has already proved.
      deviceSecret: Preference.getOrCreateDeviceSecret(),
    };
    if (fcmToken) body.fcmToken = fcmToken;

    return await ApiService.post(ApiUrls.register, body);
  },

  /** Null means this number has never been submitted, not that the call failed. */
  async status(mobileNo: string): Promise<RegistrationStatusInfo | null> {
    return parseRegistrationStatus(
      await ApiService.get(ApiUrls.registrationStatus(mobileNo)),
    );
  },

  /**
   * Both lookups answer 200 with a null payload when the ULIP gateway is slow
   * or the number is unknown — the form treats that as "couldn't confirm" and
   * still lets the driver submit, mirroring the backend's best-effort stance.
   */
  async lookupVehicle(vehicleNumber: string): Promise<VehicleInfo | null> {
    const raw = await ApiService.post(ApiUrls.lookupVehicle, {
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
    });
    return parseVehicleInfo(raw?.data);
  },

  async lookupLicence(
    driverLicenceNumber: string,
    dob: string,
  ): Promise<DriverLicenceInfo | null> {
    const raw = await ApiService.post(ApiUrls.lookupLicence, {
      driverLicenceNumber: driverLicenceNumber.trim(),
      dob: dob.trim(),
    });
    return parseDriverLicenceInfo(raw?.data);
  },
} as const;
