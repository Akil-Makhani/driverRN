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
const LR_MEDIA_URI_PREFIX = 'lr_media_uri:';

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

  /**
   * The MediaStore entry a downloaded LR was written to, keyed by filename.
   * Downloading the same LR again writes over that entry instead of letting
   * MediaStore add "LR-0152 (1).pdf" beside it.
   */
  saveLrMediaUri(fileName: string, uri: string): void {
    storage.set(`${LR_MEDIA_URI_PREFIX}${fileName}`, uri);
  },
  getLrMediaUri(fileName: string): string | undefined {
    return storage.getString(`${LR_MEDIA_URI_PREFIX}${fileName}`);
  },
  /** Called when that entry turns out to be gone. */
  clearLrMediaUri(fileName: string): void {
    storage.remove(`${LR_MEDIA_URI_PREFIX}${fileName}`);
  },

  /** Logout / delete-account. Mirrors clearAuthData(). */
  clearAuthData(): void {
    storage.remove(ACCESS_TOKEN_KEY);
    storage.remove(REFRESH_TOKEN_KEY);
  },
} as const;
