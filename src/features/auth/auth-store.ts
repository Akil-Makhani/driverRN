/**
 * Replaces lib/screens/login_otp/view_model/{login,otp,logout}_view_model.dart
 * and splash_view_model.dart.
 *
 * The Flutter view models drove navigation through `shouldNavigateToX` flags
 * that a `addPostFrameCallback` in the widget watched, then cleared via
 * `navigationHandled()`. With expo-router the screens can navigate directly
 * from the awaited call, so those flags are gone — a store field that exists
 * only to trigger a side effect is a source of double-navigation bugs.
 *
 * What remains is the state the screens actually render: loading, validation,
 * error text, and the resend countdown.
 */
import { create } from 'zustand';

import { UnauthorisedException } from '@/core/api/errors';
import { UserRepository } from '@/core/services/user-repository';
import { useSession } from '@/core/session';

interface AuthState {
  // ── Login ────────────────────────────────────────────────
  /** Digits only, no formatting spaces. The input formats for display. */
  mobile: string;
  invalidMobile: boolean;
  errorMessage: string | null;
  isLoading: boolean;

  // ── OTP ──────────────────────────────────────────────────
  otp: string;
  isOtpInvalid: boolean;
  secondsRemaining: number;
  isResendAvailable: boolean;

  setMobile: (v: string) => void;
  setInvalidMobile: (v: boolean) => void;
  setOtp: (v: string) => void;

  /** Resolves true when the OTP was sent and the screen should advance. */
  sendOTP: () => Promise<boolean>;
  /** Resolves true when the OTP verified and the driver is logged in. */
  verifyOTP: (mobile: string) => Promise<boolean>;
  resendOtp: (mobile: string) => Promise<void>;

  startTimer: () => void;
  stopTimer: () => void;

  logout: () => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;

  /** Splash: resolves true when the stored token still yields a profile. */
  loadProfile: () => Promise<boolean>;

  resetLogin: () => void;
  resetOtp: () => void;
}

const RESEND_SECONDS = 59;

/**
 * The countdown lives outside the store: an interval id is not state, and
 * keeping it in the store would make every tick a store write of two fields
 * instead of one.
 */
let timerId: ReturnType<typeof setInterval> | null = null;

function clearTimer(): void {
  if (timerId != null) {
    clearInterval(timerId);
    timerId = null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  mobile: '',
  invalidMobile: false,
  errorMessage: null,
  isLoading: false,

  otp: '',
  isOtpInvalid: false,
  secondsRemaining: RESEND_SECONDS,
  isResendAvailable: false,

  setMobile: (v) => set({ mobile: v }),
  setInvalidMobile: (v) => set({ invalidMobile: v }),
  setOtp: (v) => set({ otp: v, isOtpInvalid: false }),

  async sendOTP() {
    set({ isLoading: true, errorMessage: null });
    try {
      await UserRepository.sendLoginOTP(get().mobile);
      set({ isLoading: false, errorMessage: null });
      return true;
    } catch (e) {
      set({
        isLoading: false,
        // An UnauthorisedException carries a server message worth showing
        // (e.g. "driver not registered"); anything else is noise to the driver.
        errorMessage:
          e instanceof UnauthorisedException ? e.message : 'Something went Wrong',
      });
      return false;
    }
  },

  async verifyOTP(mobile) {
    const { otp } = get();
    // Mirrors validateOtp: empty or short is invalid, and no request is made.
    if (otp.length < 4) {
      set({ isOtpInvalid: true });
      return false;
    }

    set({ isLoading: true });
    try {
      await UserRepository.verifyOTP(mobile, otp);
      set({ isLoading: false, isOtpInvalid: false });
      clearTimer();
      return true;
    } catch {
      // Dart treated both UnauthorisedException and generic failures the same:
      // mark the pin field red. The server's text is not surfaced here.
      set({ isLoading: false, isOtpInvalid: true });
      return false;
    }
  },

  async resendOtp(mobile) {
    if (!get().isResendAvailable) return;
    set({ isLoading: true });
    try {
      await UserRepository.sendLoginOTP(mobile);
    } catch (e) {
      if (__DEV__) console.log('resendOtp failed:', e);
    }
    set({ isLoading: false });
    get().startTimer();
  },

  startTimer() {
    clearTimer();
    set({ isResendAvailable: false, secondsRemaining: RESEND_SECONDS });
    timerId = setInterval(() => {
      const next = get().secondsRemaining - 1;
      if (next > 0) {
        set({ secondsRemaining: next });
      } else {
        set({ secondsRemaining: 0, isResendAvailable: true });
        clearTimer();
      }
    }, 1000);
  },

  stopTimer: clearTimer,

  async logout() {
    try {
      await UserRepository.logout();
      useSession.getState().clearSession();
      return true;
    } catch {
      // Dart stayed on the screen when logout failed rather than clearing the
      // session locally, so a network blip cannot strand a still-valid session.
      return false;
    }
  },

  async deleteAccount() {
    try {
      await UserRepository.deleteAccount();
      useSession.getState().clearSession();
      return true;
    } catch {
      return false;
    }
  },

  async loadProfile() {
    try {
      await UserRepository.profile();
      return true;
    } catch {
      return false;
    }
  },

  resetLogin: () =>
    set({ mobile: '', invalidMobile: false, errorMessage: null, isLoading: false }),

  resetOtp: () => {
    clearTimer();
    set({
      otp: '',
      isOtpInvalid: false,
      secondsRemaining: RESEND_SECONDS,
      isResendAvailable: false,
    });
  },
}));

/** "00:59" — mirrors OtpViewModel.timerText. */
export function formatTimer(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}
