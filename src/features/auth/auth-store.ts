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
import { Strings } from '@/core/constants/strings';
import { Dispatch } from '@/core/realtime/dispatch';
import { LocationTracker } from '@/core/services/location-tracker';
import { RegistrationRepository } from '@/core/services/registration-repository';
import { UserRepository } from '@/core/services/user-repository';
import { useSession } from '@/core/session';
import { Preference } from '@/core/storage/preference';
import { useRegistrationStore } from '@/features/auth/registration-store';
import type { RegistrationStatusInfo } from '@/types/registration';

/**
 * Shuts down everything that outlives a screen, on the way out of the session.
 *
 * Both of these keep running with no UI attached — a socket holding a token
 * that is about to be revoked, and an Android foreground service quietly
 * reporting the ex-driver's position to a trip they no longer have. Neither is
 * torn down by clearing the session, and duty never flips to false on this
 * path, so the duty subscription would not catch it either.
 */
async function endDriverSession(): Promise<void> {
  Dispatch.stop();
  await LocationTracker.stop();
}

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

  /**
   * Which OTP the driver is about to type. Both start from the same mobile
   * field on the login screen; the difference only shows once it is verified,
   * where 'login' lands on the dashboard and 'registration' opens the sign-up
   * form. sendOTP decides it, because only the server knows whether a number
   * has an account.
   */
  otpPurpose: 'login' | 'registration';

  setMobile: (v: string) => void;
  setInvalidMobile: (v: boolean) => void;
  setOtp: (v: string) => void;
  /** The registration path verifies elsewhere, so it reds the pins itself. */
  setOtpInvalid: (v: boolean) => void;

  /**
   * Where the login screen goes next: 'otp' when a code is on its way,
   * 'pending' when this number is waiting on the admin and the waiting screen
   * is the answer, 'stop' when a popup or errorMessage is already explaining
   * why there is nowhere to go.
   */
  sendOTP: () => Promise<'otp' | 'pending' | 'stop'>;
  /**
   * Sends the registration OTP for a number the driver typed on the register
   * screen — deliberately taking it as an argument rather than reading the
   * login field, because the two screens hold two different numbers.
   *
   * `error` carries text for the caller to show inline; when it is absent on a
   * failure, a popup is already saying what happened.
   */
  startRegistration: (mobile: string) => Promise<{ ok: boolean; error?: string }>;
  /** Resolves true when the OTP verified and the driver is logged in. */
  verifyOTP: (mobile: string) => Promise<boolean>;
  resendOtp: (mobile: string) => Promise<void>;

  startTimer: () => void;
  stopTimer: () => void;

  logout: () => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;

  /**
   * Turns an approval into a session, using the secret this device sent with
   * the registration — so a driver who is approved while holding the app open
   * walks into the dashboard instead of being handed a login screen for the
   * number they proved to register.
   *
   * Resolves false whenever that is not on: a device that did not submit this
   * registration has no secret, a secret is only good once, and the server can
   * refuse. Every one of those means the ordinary OTP login, which is why the
   * callers treat false as "go to login" rather than as an error.
   */
  claimApprovedSession: (mobile: string) => Promise<boolean>;

  /** Splash: resolves true when the stored token still yields a profile. */
  loadProfile: () => Promise<boolean>;
  /**
   * Splash: 'approved' when the driver behind the loaded profile may reach the
   * dashboard. Anything else ends the session locally — 'pending' belongs on
   * the waiting screen, and 'other' on login, where the popup this raised
   * starts them on the registration path.
   */
  ensureApproved: () => Promise<'approved' | 'pending' | 'other'>;

  resetLogin: () => void;
  resetOtp: () => void;
}

const RESEND_SECONDS = 59;

/** Same rule the login screen enforces before it calls sendOTP. */
const MOBILE_LENGTH = 10;

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
  otpPurpose: 'login',

  setMobile: (v) => set({ mobile: v }),
  setInvalidMobile: (v) => set({ invalidMobile: v }),
  setOtp: (v) => set({ otp: v, isOtpInvalid: false }),
  setOtpInvalid: (v) => set({ isOtpInvalid: v }),

  async sendOTP() {
    set({ isLoading: true, errorMessage: null });
    const mobile = get().mobile;

    // What decides the path is the admin's decision, not whether a Driver row
    // happens to exist. Only an approved driver belongs on the login OTP: a
    // driver added by hand on the fleet Drivers page has an account without
    // ever having been approved, and still registers like everybody else.
    let registration: RegistrationStatusInfo | null = null;
    let decisionKnown = false;
    try {
      registration = await RegistrationRepository.status(mobile);
      decisionKnown = true;
    } catch {
      // Best effort: a status call that fails must not lock out a driver who
      // could otherwise get in, so leave the choice to the login-first path
      // below — which is exactly what ran before this check existed.
    }

    if (decisionKnown && registration?.status === 'Pending') {
      // Nothing for them to type. The answer is the waiting screen, which the
      // login screen sends them to on this result.
      useRegistrationStore.getState().showPending(mobile, registration);
      set({ isLoading: false, errorMessage: null });
      return 'pending';
    }

    if (decisionKnown && registration?.status === 'Rejected') {
      // Says so here rather than dropping them into a blank form: the reason
      // is the point, and checkStatusFor also seeds the form with what was
      // rejected so the popup's "Edit details" opens something worth fixing.
      await useRegistrationStore.getState().checkStatusFor(mobile);
      set({ isLoading: false, errorMessage: null });
      return 'stop';
    }

    if (decisionKnown && registration == null) {
      // Never registered. LOG IN is not the way in for them, and saying that
      // out loud beats silently opening a form they did not ask for — the
      // popup's REGISTER NOW is what takes them there.
      useRegistrationStore.getState().showRegistrationRequired();
      set({ isLoading: false, errorMessage: null });
      return 'stop';
    }

    try {
      await UserRepository.sendLoginOTP(mobile);
      set({ isLoading: false, errorMessage: null, otpPurpose: 'login' });
      return 'otp';
    } catch (e) {
      // 404 means "no account for this number" — the beginning of registration,
      // not a failure. Send the registration OTP instead and carry on to the
      // same OTP screen; verifying it opens the sign-up form rather than the
      // dashboard. Every other status (403 blocked, above all) stays an error.
      if (e instanceof UnauthorisedException && e.statusCode === 404) {
        try {
          await RegistrationRepository.sendOtp(mobile);
          set({ isLoading: false, errorMessage: null, otpPurpose: 'registration' });
          return 'otp';
        } catch (registerError) {
          // The account existed after all. The registration endpoint repairs
          // approvals that never got a Driver row behind them, so the login
          // OTP that just 404'd will succeed on a second try — retry it rather
          // than leaving the driver stuck on an error they cannot act on.
          const hasAccount =
            registerError instanceof UnauthorisedException &&
            (registerError.data as { hasAccount?: boolean } | undefined)?.hasAccount === true;
          if (hasAccount) {
            try {
              await UserRepository.sendLoginOTP(mobile);
              set({ isLoading: false, errorMessage: null, otpPurpose: 'login' });
              return 'otp';
            } catch {
              // Fall through to the error below.
            }
          }

          set({
            isLoading: false,
            errorMessage:
              registerError instanceof UnauthorisedException
                ? registerError.message
                : 'Something went Wrong',
          });
          return 'stop';
        }
      }

      set({
        isLoading: false,
        // An UnauthorisedException carries a server message worth showing
        // (e.g. "Your account is blocked."); anything else is noise to the driver.
        errorMessage:
          e instanceof UnauthorisedException ? e.message : 'Something went Wrong',
      });
      return 'stop';
    }
  },

  async startRegistration(mobile) {
    if (mobile.length !== MOBILE_LENGTH) {
      return { ok: false, error: Strings.mobileValidation };
    }

    try {
      await RegistrationRepository.sendOtp(mobile);
      // Only otpPurpose is written here: the login screen's own mobile, error
      // and loading fields belong to the login screen, and the register screen
      // keeps its equivalents locally so neither can show the other's state.
      set({ otpPurpose: 'registration' });
      return { ok: true };
    } catch (e) {
      // The server refuses a number that is already approved. That is not an
      // error worth red text — it is the "you already have an account, go and
      // log in" popup, which is the one thing they can act on from here.
      const hasAccount =
        e instanceof UnauthorisedException &&
        (e.data as { hasAccount?: boolean } | undefined)?.hasAccount === true;
      if (hasAccount) {
        useRegistrationStore.getState().showAlreadyRegistered(e.message);
        return { ok: false };
      }

      return {
        ok: false,
        error:
          e instanceof UnauthorisedException ? e.message : 'Something went Wrong',
      };
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
      // Resend the same kind of OTP that was sent the first time, or a
      // registering driver would be handed a login OTP their number cannot
      // have and the code would never verify.
      if (get().otpPurpose === 'registration') {
        await RegistrationRepository.sendOtp(mobile);
      } else {
        await UserRepository.sendLoginOTP(mobile);
      }
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
      await endDriverSession();
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
      await endDriverSession();
      useSession.getState().clearSession();
      return true;
    } catch {
      return false;
    }
  },

  async claimApprovedSession(mobile) {
    const secret = Preference.getDeviceSecret();
    // No secret means this phone is not the one that registered — a driver who
    // applied on another device, or one that has already spent it.
    if (!mobile || !secret) return false;

    set({ isLoading: true });
    try {
      const model = await UserRepository.claimApprovedSession(mobile, secret);
      set({ isLoading: false });
      if (model.status !== 'success' || !model.data) return false;

      // Spent on the server the moment it was accepted; keeping our copy would
      // only leave a dead credential on the phone.
      Preference.clearDeviceSecret();
      // The wait is over and its record has been read — nothing here should
      // greet them again once they are inside the app.
      useRegistrationStore.getState().clearPending();
      useRegistrationStore.getState().dismissOutcome();
      return true;
    } catch {
      set({ isLoading: false });
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

  async ensureApproved() {
    const mobile = useSession.getState().user?.mobileNumber?.trim() ?? '';
    // Nothing to check against. Signing someone out over a profile that came
    // back without a number would be the worse of the two failures.
    if (!mobile) return 'approved';

    let info: RegistrationStatusInfo | null;
    try {
      info = await RegistrationRepository.status(mobile);
    } catch {
      // Best effort, for the same reason as in sendOTP: a network blip must
      // not throw a driver out of a session that is otherwise good.
      return 'approved';
    }

    if (info?.status === 'Approved') return 'approved';

    // Not approved — so not through the front door. Only the local tokens go;
    // the Driver account itself is untouched, and the driver keeps whatever
    // registration record they already have.
    Preference.clearAuthData();
    useSession.getState().clearSession();

    if (info?.status === 'Pending') {
      useRegistrationStore.getState().showPending(mobile, info);
      return 'pending';
    }
    if (info?.status === 'Rejected') {
      // Fills in the reason and seeds the form with what was rejected, so the
      // login screen's "Edit details" lands on a form worth correcting.
      await useRegistrationStore.getState().checkStatusFor(mobile);
    }
    return 'other';
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
