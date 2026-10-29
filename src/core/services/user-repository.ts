/**
 * Port of lib/repository/user_repository.dart.
 *
 * Side effects preserved: verifyOTP attaches the FCM token and persists both
 * tokens on success; profile() re-attaches the stored tokens to the returned
 * user (the profile endpoint does not echo them back); logout and
 * deleteAccount clear storage.
 */
import messaging from '@react-native-firebase/messaging';

import { OFFER_CHANNEL_ID } from '../constants/notification-channels';
import { ApiService } from '../api/api-service';
import { ApiUrls } from '../api/endpoints';
import { Preference } from '../storage/preference';
import type { CommonResponse } from '@/types/api';
import { type UserResponse, parseUserResponse } from '@/types/user';
import { hasChosenLanguage, useLanguageStore } from '../i18n/language';
import { useSession } from '../session';

/**
 * The phone's language is the driver's choice (see session.updateSession), so
 * when the server holds a different one — the admin's default, or a choice
 * made before login — the phone's is saved up rather than the server's taken
 * down. Fire and forget: the app already shows the right language, and the
 * next profile load tries again.
 */
function syncLanguageToServer(serverLanguage: string | undefined): void {
  if (!hasChosenLanguage()) return;
  const language = useLanguageStore.getState().language;
  // No field at all means an API that predates languages, with nothing to save to.
  if (!serverLanguage || serverLanguage === language) return;
  UserRepository.updateLanguage(language).catch((e) => {
    if (__DEV__) console.log('syncLanguageToServer failed:', e);
  });
}

export const UserRepository = {
  async sendLoginOTP(mobile: string): Promise<CommonResponse> {
    return await ApiService.post(ApiUrls.sendOTP, { mobileNumber: mobile });
  },

  async verifyOTP(mobile: string, otp: string): Promise<UserResponse> {
    // A missing FCM token must not block login — Dart swallowed the error and
    // sent the request without the field.
    let fcmToken: string | null = null;
    try {
      fcmToken = await messaging().getToken();
    } catch (e) {
      if (__DEV__) console.log('Error getting FCM token:', e);
    }

    const body: Record<string, unknown> = { mobileNumber: mobile, otp };
    if (fcmToken) body.fcmToken = fcmToken;
    // The offer channel id deliberately does NOT go here. This endpoint sits
    // behind a Joi schema that forbids unknown keys, so sending it made every
    // verification 422 with "offer channel id is not allowed" — a correct OTP
    // could never log anybody in.
    //
    // Nothing is lost by dropping it: no deployed server reads the field. It
    // is not in the login schema, and the endpoint registerFcmToken reports it
    // to (PUT /driver/account/fcm-token) is itself 404 on staging — the branch
    // that added both was never deployed. Which channel a push rings on is
    // decided by the server's own hardcoded id and the channel this app
    // creates locally, neither of which involves this request. Put the field
    // back only once the server both declares it in `driver-otp-verify` and
    // actually reads it.

    const model = parseUserResponse(await ApiService.post(ApiUrls.verifyOTP, body));
    if (model.status === 'success' && model.data) {
      useSession.getState().updateSession(model.data);
      Preference.saveAccessToken(model.data.accessToken);
      Preference.saveRefreshToken(model.data.refreshToken);
      syncLanguageToServer(model.data.language);
    }
    return model;
  },

  /**
   * The second way into a session, for a driver whose registration has just
   * been approved: the device secret their phone sent with the form stands in
   * for the login OTP, so approval opens the app rather than asking them to
   * prove — with a second code — the number they proved to register.
   *
   * Lives here rather than with the other registration calls because what it
   * does is log someone in, and persisting a session is this file's job. The
   * server answers in the same shape verifyOTP does, which is why both end in
   * the same three lines.
   */
  async claimApprovedSession(
    mobile: string,
    deviceSecret: string,
  ): Promise<UserResponse> {
    let fcmToken: string | null = null;
    try {
      fcmToken = await messaging().getToken();
    } catch (e) {
      if (__DEV__) console.log('Error getting FCM token:', e);
    }

    const body: Record<string, unknown> = { mobileNo: mobile, deviceSecret };
    if (fcmToken) body.fcmToken = fcmToken;

    const model = parseUserResponse(
      await ApiService.post(ApiUrls.registerSession, body),
    );
    if (model.status === 'success' && model.data) {
      useSession.getState().updateSession(model.data);
      Preference.saveAccessToken(model.data.accessToken);
      Preference.saveRefreshToken(model.data.refreshToken);
      syncLanguageToServer(model.data.language);
    }
    return model;
  },

  async profile(): Promise<UserResponse> {
    const model = parseUserResponse(await ApiService.get(ApiUrls.profile));
    if (model.data) {
      const accessToken = Preference.getAccessToken();
      const refreshToken = Preference.getRefreshToken();
      if (accessToken) model.data.accessToken = accessToken;
      if (refreshToken) model.data.refreshToken = refreshToken;
    }
    useSession.getState().updateSession(model.data ?? null);
    if (model.data) syncLanguageToServer(model.data.language);
    return model;
  },

  /**
   * Adds or changes the driver's photo: uploads the picture straight to S3,
   * then files its key. The session takes the profile that comes back, so the
   * dashboard and sidebar switch to the new photo at once.
   */
  async updateProfilePhoto(uri: string, contentType: string): Promise<boolean> {
    const raw = await ApiService.post(ApiUrls.profilePhotoUploadUrl, { contentType });
    const uploadUrl: string | undefined = raw?.data?.uploadUrl;
    const fileKey: string | undefined = raw?.data?.fileKey;
    if (!uploadUrl || !fileKey) return false;

    const blob = await (await fetch(uri)).blob();
    const s3 = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });
    if (!s3.ok) return false;
    return await UserRepository.savePhoto(fileKey);
  },

  /** Takes the photo off; the stock avatar shows again. */
  async removeProfilePhoto(): Promise<boolean> {
    return await UserRepository.savePhoto(null);
  },

  async savePhoto(fileKey: string | null): Promise<boolean> {
    const model = parseUserResponse(await ApiService.patch(ApiUrls.profilePhoto, { fileKey }));
    const { user, updateSession } = useSession.getState();
    if (model.status !== 'success' || !model.data || !user) return false;
    // The endpoint does not echo the tokens back; keep the ones held.
    updateSession({ ...model.data, accessToken: user.accessToken, refreshToken: user.refreshToken });
    return true;
  },

  /** Saves the driver's language on the server, where the admin sees it. */
  async updateLanguage(language: string): Promise<CommonResponse> {
    const raw: CommonResponse = await ApiService.patch(ApiUrls.language, { language });
    const { user, updateSession } = useSession.getState();
    if (raw.status === 'success' && user) updateSession({ ...user, language });
    return raw;
  },

  async logout(): Promise<CommonResponse> {
    const raw = await ApiService.post(ApiUrls.logout);
    Preference.clearAuthData();
    return raw;
  },

  async deleteAccount(): Promise<CommonResponse> {
    const raw = await ApiService.delete(ApiUrls.deleteAccount);
    Preference.clearAuthData();
    return raw;
  },
  /**
   * Tells the server this device's current push token.
   *
   * The token is sent at login too, but FCM rotates it independently of the
   * session — a reinstall, cleared app data, a restore onto a new phone. The
   * driver stays logged in and the app looks healthy while the server pushes
   * to a dead token and offers silently stop arriving. Calling this whenever
   * duty is switched on, and whenever Firebase hands over a new token, keeps
   * the stored one current.
   *
   * Failure is swallowed: this is best-effort background housekeeping, and the
   * socket still delivers offers while the app is open.
   */

  /**
   * Reports this device's push token and notification channel to the server.
   *
   * The server dry-runs the token against FCM and answers `refreshToken` when
   * it is already dead — which happens when Android's auto-backup restores a
   * reinstalled app's Firebase identity from the install that was uninstalled.
   * getToken() keeps handing back that dead token forever, so the only way out
   * is to delete it and let Firebase issue a new one. Retried once, because a
   * freshly issued token is valid by definition and a loop here would spin on
   * every launch.
   */
  async registerFcmToken(retryOnDeadToken = true): Promise<void> {
    // Logged out: there is no driver to attach a token to, and asking Firebase
    // for one would only undo the deleteToken() logout just did.
    if (!Preference.getAccessToken()) return;
    try {
      const fcmToken = await messaging().getToken();
      if (!fcmToken) return;
      const response: any = await ApiService.put(ApiUrls.fcmToken, {
        fcmToken,
        offerChannelId: OFFER_CHANNEL_ID,
      });

      if (retryOnDeadToken && response?.data?.refreshToken) {
        if (__DEV__) console.log('FCM token was dead; asking Firebase for a new one');
        await messaging().deleteToken();
        await UserRepository.registerFcmToken(false);
      }
    } catch (e) {
      if (__DEV__) console.log('registerFcmToken failed:', e);
    }
  },

} as const;
