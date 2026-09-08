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
const PENDING_REGISTRATION_KEY = 'pending_registration_mobile';
const DEVICE_SECRET_KEY = 'registration_device_secret';

/** 32 bytes as hex — the length the API requires of a device secret. */
const SECRET_BYTES = 32;

/**
 * Best random the runtime offers. Hermes ships no Web Crypto, and pulling in
 * expo-crypto for one value would mean a native rebuild, so Math.random is the
 * fallback — weaker, but it only has to be unguessable to someone who already
 * knows the driver's mobile number and is racing a secret that the server
 * spends on first use.
 */
function randomHex(bytes: number): string {
  const webCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof webCrypto?.getRandomValues === 'function') {
    const buffer = new Uint8Array(bytes);
    webCrypto.getRandomValues(buffer);
    return Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  let hex = '';
  while (hex.length < bytes * 2) {
    hex += Math.floor(Math.random() * 0x100000000)
      .toString(16)
      .padStart(8, '0');
  }
  return hex.slice(0, bytes * 2);
}

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
   * Mobile number of a registration that is awaiting the admin decision.
   * Deliberately not part of clearAuthData(): this outlives the tokens in
   * both directions — it exists before there has ever been a token, and an
   * approved driver who logs out has still registered. The store clears it
   * once the decision has been shown.
   */
  savePendingRegistration(mobile: string): void {
    storage.set(PENDING_REGISTRATION_KEY, mobile);
  },
  getPendingRegistration(): string | undefined {
    return storage.getString(PENDING_REGISTRATION_KEY);
  },
  clearPendingRegistration(): void {
    storage.remove(PENDING_REGISTRATION_KEY);
  },

  /**
   * The secret this phone sends with a registration and trades back for a
   * session once the admin approves it — so approval opens the app rather
   * than sending the driver to type a login OTP for a number they proved at
   * the start of the very same flow.
   *
   * Created on first use and kept until it is spent, because the two halves
   * are minutes or days apart. Out of clearAuthData for the same reason as
   * the pending mobile: it exists before there has ever been a token.
   */
  getOrCreateDeviceSecret(): string {
    const existing = storage.getString(DEVICE_SECRET_KEY);
    if (existing) return existing;
    const secret = randomHex(SECRET_BYTES);
    storage.set(DEVICE_SECRET_KEY, secret);
    return secret;
  },
  /** The secret as held, or undefined when this device never registered. */
  getDeviceSecret(): string | undefined {
    return storage.getString(DEVICE_SECRET_KEY);
  },
  /** Spent: the server accepts each secret once, so a kept copy is dead weight. */
  clearDeviceSecret(): void {
    storage.remove(DEVICE_SECRET_KEY);
  },

  /** Logout / delete-account. Mirrors clearAuthData(). */
  clearAuthData(): void {
    storage.remove(ACCESS_TOKEN_KEY);
    storage.remove(REFRESH_TOKEN_KEY);
  },
} as const;
