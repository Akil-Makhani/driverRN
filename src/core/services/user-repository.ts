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
import { useSession } from '../session';

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
    // Which offer channel this install created. Android pins a channel's sound
    // at creation, so a new siren means a new channel id — and a push naming a
    // channel this device never created is dropped silently. Telling the server
    // what we actually have is what stops that.
    body.offerChannelId = OFFER_CHANNEL_ID;

    const model = parseUserResponse(await ApiService.post(ApiUrls.verifyOTP, body));
    if (model.status === 'success' && model.data) {
      useSession.getState().updateSession(model.data);
      Preference.saveAccessToken(model.data.accessToken);
      Preference.saveRefreshToken(model.data.refreshToken);
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
    return model;
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
