import { createMMKV } from 'react-native-mmkv';

/**
 * Port of lib/services/preference_service.dart (SharedPreferences → MMKV).
 *
 * The Dart version was async on every call because SharedPreferences is; MMKV
 * reads synchronously, so the token can be read inline when building a request
 * instead of awaited. Key names are unchanged, so an app updated in place keeps
 * reading the same values.
 */
const storage = createMMKV({ id: 'bst-driver-storage' });

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const Preference = {
  raw: storage,

  saveAccessToken(token: string): void {
    storage.set(ACCESS_TOKEN_KEY, token);
  },
  getAccessToken(): string | undefined {
    return storage.getString(ACCESS_TOKEN_KEY);
  },

  saveRefreshToken(token: string): void {
    storage.set(REFRESH_TOKEN_KEY, token);
  },
  getRefreshToken(): string | undefined {
    return storage.getString(REFRESH_TOKEN_KEY);
  },

  /** Logout / delete-account. Mirrors clearAuthData(). */
  clearAuthData(): void {
    storage.remove(ACCESS_TOKEN_KEY);
    storage.remove(REFRESH_TOKEN_KEY);
  },
} as const;
