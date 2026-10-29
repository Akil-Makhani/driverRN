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
  type RegistrationDetails,
  type RegistrationPhotoKey,
  type RegistrationForm,
  type RegistrationStatusInfo,
  type VehicleInfo,
  parseDriverLicenceInfo,
  parseRegistrationStatus,
  parseVehicleInfo,
} from '@/types/registration';

/**
 * The two things every registration write carries, whichever endpoint it goes
 * to: the secret that will later be traded for a session, and the token the
 * decision is pushed to. Shared because all three writes now need them —
 * `start` is the first to reach the server, so it cannot be the one that
 * leaves them out.
 */
async function deviceBody(): Promise<Record<string, unknown>> {
  let fcmToken: string | null = null;
  try {
    fcmToken = await messaging().getToken();
  } catch (e) {
    if (__DEV__) console.log('Error getting FCM token:', e);
  }

  return {
    // Sent with the first write and traded back for a session the moment the
    // admin approves — which is what lets approval open the app instead of
    // asking for a login OTP on a number already proved. Re-sent on the later
    // writes too: the same device gets the same secret back, so a driver who
    // registered here and completed here still ends up holding it.
    deviceSecret: Preference.getOrCreateDeviceSecret(),
    ...(fcmToken ? { fcmToken } : {}),
  };
}

/** The form fields, normalised the way the server expects them. */
function detailsBody(details: RegistrationDetails): Record<string, unknown> {
  // The driver's own photo travels beside the four documents, not among them.
  const { profilePhoto, ...documents } = details.documents;
  return {
    driverName: details.driverName.trim(),
    vehicleNumber: details.vehicleNumber.trim().toUpperCase(),
    driverLicenceNumber: details.driverLicenceNumber.trim(),
    dob: details.dob.trim(),
    documents,
    ...(profilePhoto ? { profilePhoto } : {}),
  };
}

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
   * Files the registration the moment its OTP verifies, on the number alone.
   * The record it creates is Pending and incomplete: it holds the driver's
   * place and gives the app somewhere to come back to, but an admin has
   * nothing to decide on until {@link submitDetails} fills in the rest.
   *
   * Carries the same device secret and FCM token {@link register} does,
   * because it is now the first of the two to reach the server and those are
   * what let approval push to this phone and open the app on it.
   */
  async start(mobileNo: string): Promise<CommonResponse> {
    return await ApiService.post(ApiUrls.registerStart, {
      mobileNo: mobileNo.trim(),
      ...(await deviceBody()),
    });
  },

  /**
   * Completes a registration already on file. PATCH rather than POST because
   * the record exists — `start` or a previous submission made it — and this
   * only fills in what was skipped.
   */
  async submitDetails(
    mobileNo: string,
    details: RegistrationDetails,
  ): Promise<CommonResponse> {
    return await ApiService.patch(ApiUrls.registerDetails, {
      mobileNo: mobileNo.trim(),
      ...detailsBody(details),
      ...(await deviceBody()),
    });
  },

  /**
   * Submits the form in one go. Still the path for a driver who fills
   * everything in before leaving the form, and the fallback for a server that
   * does not carry the two-step endpoints — the store falls back to this when
   * `start` is not there.
   *
   * The FCM token rides along so the backend can push the admin's decision
   * straight to this device — there is no Driver record to look a token up on
   * until the driver is approved. A device that refused notification
   * permission simply sends no token, exactly as verifyOTP does.
   */
  async register(form: RegistrationForm): Promise<CommonResponse> {
    return await ApiService.post(ApiUrls.register, {
      mobileNo: form.mobileNo.trim(),
      ...detailsBody(form),
      ...(await deviceBody()),
    });
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

  /**
   * Uploads one document photo and resolves its S3 key. Two steps: the API
   * signs a PUT for this number's folder (401 if the OTP verification has
   * lapsed — the caller sends them back through it), then the bytes go
   * straight to S3, as a Blob for the same reason the trip uploads use one.
   */
  async uploadDocument(
    mobileNo: string,
    documentType: RegistrationPhotoKey,
    uri: string,
    contentType: string,
  ): Promise<string> {
    const raw = await ApiService.post(ApiUrls.registerDocumentUploadUrl, {
      mobileNo: mobileNo.trim(),
      documentType,
      contentType,
    });
    const uploadUrl: string | undefined = raw?.data?.uploadUrl;
    const fileKey: string | undefined = raw?.data?.fileKey;
    if (!uploadUrl || !fileKey) throw new Error('No upload URL returned');

    const blob = await (await fetch(uri)).blob();
    const s3 = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });
    if (!s3.ok) throw new Error(`Upload failed: ${s3.status}`);
    return fileKey;
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
