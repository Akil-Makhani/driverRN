/**
 * Port of lib/repository/user_repository.dart.
 *
 * Side effects preserved: verifyOTP attaches the FCM token and persists both
 * tokens on success; profile() re-attaches the stored tokens to the returned
 * user (the profile endpoint does not echo them back); logout and
 * deleteAccount clear storage.
 */
import messaging from '@react-native-firebase/messaging';

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
} as const;
