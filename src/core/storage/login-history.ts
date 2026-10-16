import { createMMKV } from 'react-native-mmkv';

/**
 * Mobile numbers that have passed an OTP on this device — for logging in or
 * for registering — newest first, offered as suggestions on the login and
 * registration number fields so a driver never has to type theirs twice.
 *
 * A SEPARATE MMKV instance on purpose: logout (and a 401) wipes the main
 * store, which would take this list with it — and after a logout is exactly
 * when it is needed. Same approach as TempoRN's login-history.ts.
 */
const storage = createMMKV({ id: 'bst-driver-login-history' });
const KEY = 'recentMobileNumbers';
const MAX = 3;

export const LoginHistory = {
  recent(): string[] {
    const s = storage.getString(KEY);
    if (s == null) return [];
    try {
      const list = JSON.parse(s);
      return Array.isArray(list) ? list.filter((n) => typeof n === 'string') : [];
    } catch {
      return [];
    }
  },

  /** Call once an OTP for this number verifies; moves it to the front. */
  remember(mobileNo: string): void {
    const n = mobileNo.trim();
    if (!/^\d{10}$/.test(n)) return;
    const list = [n, ...LoginHistory.recent().filter((x) => x !== n)].slice(0, MAX);
    storage.set(KEY, JSON.stringify(list));
  },
};
