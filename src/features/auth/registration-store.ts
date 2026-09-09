/**
 * Drives the registration screen and the four popups the flow can end in.
 *
 * The outcome lives here rather than in either screen because two of them
 * raise it: the register screen after a submit, and the login screen after the
 * launch-time status check (and after a push arrives while the app is open).
 * Keeping one field means the driver never sees two of these stacked.
 */
import { create } from 'zustand';

import { UnauthorisedException } from '@/core/api/errors';
import { RegistrationRepository } from '@/core/services/registration-repository';
import { Preference } from '@/core/storage/preference';
import { Strings } from '@/core/constants/strings';
import { isSuccess } from '@/types/api';
import type {
  DriverLicenceInfo,
  RegistrationForm,
  RegistrationStatus,
  VehicleInfo,
} from '@/types/registration';

export type FieldKey = keyof RegistrationForm;

/** Which of the four popups to show, and the words to put in it. */
export interface RegistrationOutcome {
  kind: 'required' | 'pending' | 'approved' | 'rejected' | 'exists';
  message: string;
  /** Admin's reason — only ever set for 'rejected'. */
  reason?: string;
}

/** Idle → loading → done, so the form can show a spinner beside each field. */
type LookupState = 'idle' | 'loading' | 'done' | 'failed';

interface RegistrationState {
  form: RegistrationForm;
  errors: Partial<Record<FieldKey, string>>;
  isSubmitting: boolean;
  submitError: string | null;

  vehicleInfo: VehicleInfo | null;
  vehicleLookup: LookupState;
  licenceInfo: DriverLicenceInfo | null;
  licenceLookup: LookupState;

  outcome: RegistrationOutcome | null;
  isCheckingStatus: boolean;

  setField: (key: FieldKey, value: string) => void;
  validate: () => boolean;
  submit: () => Promise<boolean>;

  lookupVehicle: () => Promise<void>;
  lookupLicence: () => Promise<void>;

  /**
   * Verifies the registration OTP and reports where the driver goes next:
   * a blank form, a resubmission of a rejected one, or straight to a popup.
   * Returns the destination rather than navigating, so the OTP screen keeps
   * ownership of routing. Null means the code was wrong.
   */
  verifyOtp: (
    mobileNo: string,
    otp: string,
  ) => Promise<'form' | 'pending' | 'approved' | 'rejected' | null>;

  /** Launch-time check for whichever number last submitted a registration. */
  checkPendingStatus: () => Promise<void>;
  /** Same check for a number the driver just typed on the login screen. */
  checkStatusFor: (mobileNo: string) => Promise<RegistrationStatus | null>;
  /**
   * Raise the waiting popup for a registration already known to be Pending,
   * for the callers that have just read the status themselves — checkStatusFor
   * would only fetch it a second time to reach the same popup.
   */
  showPending: (mobileNo: string) => void;
  /**
   * Raise the "you have not registered yet" popup, for a number that tried to
   * log in without ever having submitted a registration. Said out loud rather
   * than silently redirecting, so the driver knows why the app did not let
   * them in and what they have to do about it.
   */
  showRegistrationRequired: () => void;
  /**
   * "This number already has an account" — for a driver who reaches for
   * REGISTER when logging in is what they actually want.
   */
  showAlreadyRegistered: (message?: string) => void;
  /** A decision that arrived as a push while the app was open. */
  showPushedDecision: (status: string, reason?: string) => void;

  dismissOutcome: () => void;
  reset: () => void;
}

const EMPTY_FORM: RegistrationForm = {
  driverName: '',
  mobileNo: '',
  vehicleNumber: '',
  driverLicenceNumber: '',
  dob: '',
};

// ── Field rules ──────────────────────────────────────────────
// Deliberately lenient: these exist to catch a typo before a round trip, not
// to be the authority on what a valid RC or licence looks like. ULIP is that
// authority, and a number these accept but ULIP does not still submits — the
// admin sees the request either way.

/** Strips spaces and hyphens; both numbers are written with either or neither. */
const compact = (v: string): string => v.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

/** "UP32KH0320" — state, RTO, series, then the four-digit number. */
const VEHICLE_RE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

/** "GJ18 20220001846" — two state letters then 11-14 digits. */
const LICENCE_RE = /^[A-Z]{2}[0-9]{11,14}$/;

/**
 * Ten digits, with no rule about the first one. By the time the form is shown
 * this number has already been proved by OTP, so re-judging whether it looks
 * like a real Indian mobile would only reject numbers the server just texted.
 */
const MOBILE_RE = /^[0-9]{10}$/;

const MIN_AGE_YEARS = 18;

/** True only for a real calendar date — "2005-02-31" must not pass. */
function isRealDate(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return (
    date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
  );
}

function ageOn(iso: string, now = new Date()): number {
  const [y, mo, d] = iso.split('-').map(Number);
  let age = now.getFullYear() - y;
  // Birthday not yet reached this year.
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) {
    age -= 1;
  }
  return age;
}

function validateForm(
  form: RegistrationForm,
): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};

  if (form.driverName.trim().length < 3) {
    errors.driverName = Strings.registerNameValidation;
  }
  if (!MOBILE_RE.test(form.mobileNo)) {
    errors.mobileNo = Strings.mobileValidation;
  }
  if (!VEHICLE_RE.test(compact(form.vehicleNumber))) {
    errors.vehicleNumber = Strings.registerVehicleValidation;
  }
  if (!LICENCE_RE.test(compact(form.driverLicenceNumber))) {
    errors.driverLicenceNumber = Strings.registerLicenceValidation;
  }
  if (!isRealDate(form.dob)) {
    errors.dob = Strings.registerDobValidation;
  } else if (ageOn(form.dob) < MIN_AGE_YEARS) {
    errors.dob = Strings.registerDobAgeValidation;
  }

  return errors;
}

/** Whether a field is complete enough to be worth a ULIP round trip. */
const vehicleReady = (f: RegistrationForm) => VEHICLE_RE.test(compact(f.vehicleNumber));
const licenceReady = (f: RegistrationForm) =>
  LICENCE_RE.test(compact(f.driverLicenceNumber)) && isRealDate(f.dob);

export const useRegistrationStore = create<RegistrationState>((set, get) => ({
  form: { ...EMPTY_FORM },
  errors: {},
  isSubmitting: false,
  submitError: null,

  vehicleInfo: null,
  vehicleLookup: 'idle',
  licenceInfo: null,
  licenceLookup: 'idle',

  outcome: null,
  isCheckingStatus: false,

  setField(key, value) {
    const form = { ...get().form, [key]: value };
    // Clear only this field's error: re-running the whole validation on every
    // keystroke would light up fields the driver has not reached yet.
    const errors = { ...get().errors };
    delete errors[key];

    // A changed vehicle/licence invalidates whatever was looked up for the old
    // value, so the form never shows details belonging to a different number.
    const patch: Partial<RegistrationState> = { form, errors, submitError: null };
    if (key === 'vehicleNumber') {
      patch.vehicleInfo = null;
      patch.vehicleLookup = 'idle';
    }
    if (key === 'driverLicenceNumber' || key === 'dob') {
      patch.licenceInfo = null;
      patch.licenceLookup = 'idle';
    }
    set(patch as RegistrationState);
  },

  validate() {
    const errors = validateForm(get().form);
    set({ errors });
    return Object.keys(errors).length === 0;
  },

  async lookupVehicle() {
    const { form, vehicleLookup } = get();
    if (!vehicleReady(form) || vehicleLookup === 'loading') return;
    set({ vehicleLookup: 'loading' });
    try {
      const info = await RegistrationRepository.lookupVehicle(form.vehicleNumber);
      // Guard against a slow response for a number the driver has since
      // edited — without this the details would describe the old vehicle.
      if (get().form.vehicleNumber !== form.vehicleNumber) return;
      set({ vehicleInfo: info, vehicleLookup: info ? 'done' : 'failed' });
    } catch {
      if (get().form.vehicleNumber !== form.vehicleNumber) return;
      set({ vehicleInfo: null, vehicleLookup: 'failed' });
    }
  },

  async lookupLicence() {
    const { form, licenceLookup } = get();
    if (!licenceReady(form) || licenceLookup === 'loading') return;
    set({ licenceLookup: 'loading' });
    try {
      const info = await RegistrationRepository.lookupLicence(
        form.driverLicenceNumber,
        form.dob,
      );
      const now = get().form;
      if (
        now.driverLicenceNumber !== form.driverLicenceNumber ||
        now.dob !== form.dob
      ) {
        return;
      }
      set({ licenceInfo: info, licenceLookup: info ? 'done' : 'failed' });
    } catch {
      const now = get().form;
      if (
        now.driverLicenceNumber !== form.driverLicenceNumber ||
        now.dob !== form.dob
      ) {
        return;
      }
      set({ licenceInfo: null, licenceLookup: 'failed' });
    }
  },

  async submit() {
    if (!get().validate()) return false;

    set({ isSubmitting: true, submitError: null });
    const { form } = get();
    try {
      const res = await RegistrationRepository.register(form);
      set({ isSubmitting: false });
      if (!isSuccess(res)) {
        set({ submitError: res?.message ?? Strings.somethingWentWrong });
        return false;
      }

      // Remember the number so the next launch can ask what the admin decided
      // without making the driver type it again.
      Preference.savePendingRegistration(form.mobileNo);
      set({
        outcome: {
          kind: 'pending',
          message: res.message?.trim() || Strings.registerPendingMessage,
        },
      });
      return true;
    } catch (e) {
      set({ isSubmitting: false });

      // 409 — this vehicle or licence is already on file. The server puts the
      // record's status in `data` so the popup can say whether the driver is
      // waiting on review or should simply go and log in.
      if (e instanceof UnauthorisedException && e.statusCode === 409) {
        const status = (e.data as { status?: RegistrationStatus } | undefined)?.status;
        set({
          outcome: {
            kind: status === 'Approved' ? 'approved' : 'exists',
            message: e.message?.trim() || Strings.registerExistsMessage,
          },
        });
        return false;
      }

      // 401 — the OTP verification lapsed (it is good for 15 minutes). Nothing
      // is wrong with what they typed, so the form keeps its contents and only
      // says the number has to be verified again.
      if (e instanceof UnauthorisedException) {
        set({ submitError: e.message?.trim() || Strings.somethingWentWrong });
        return false;
      }

      set({ submitError: Strings.somethingWentWrong });
      return false;
    }
  },

  async verifyOtp(mobileNo, otp) {
    set({ isCheckingStatus: true });
    try {
      const info = await RegistrationRepository.verifyOtp(mobileNo, otp);

      // However this turns out, the number is now proved. Seeding the form
      // with it means the driver never retypes it and cannot submit under a
      // different one than the OTP went to.
      set({
        isCheckingStatus: false,
        form: { ...EMPTY_FORM, mobileNo },
        errors: {},
        submitError: null,
        vehicleInfo: null,
        vehicleLookup: 'idle',
        licenceInfo: null,
        licenceLookup: 'idle',
      });

      if (!info) return 'form';

      if (info.status === 'Approved') {
        Preference.clearPendingRegistration();
        set({ outcome: { kind: 'approved', message: Strings.registerApprovedMessage } });
        return 'approved';
      }

      if (info.status === 'Rejected') {
        Preference.clearPendingRegistration();
        // Carry the rejected details back into the form: correcting one wrong
        // digit should not mean typing all of it again.
        set({
          form: {
            ...EMPTY_FORM,
            mobileNo,
            driverName: info.driverName ?? '',
            vehicleNumber: info.vehicleNumber ?? '',
            driverLicenceNumber: info.driverLicenceNumber ?? '',
          },
          outcome: {
            kind: 'rejected',
            message: Strings.registerRejectedMessage,
            reason: info.rejectionReason,
          },
        });
        return 'rejected';
      }

      Preference.savePendingRegistration(mobileNo);
      set({ outcome: { kind: 'pending', message: Strings.registerWaitingMessage } });
      return 'pending';
    } catch {
      // A wrong or expired code. The OTP screen reds the pin boxes; there is
      // nothing here worth a popup.
      set({ isCheckingStatus: false });
      return null;
    }
  },

  async checkPendingStatus() {
    const mobile = Preference.getPendingRegistration();
    if (!mobile) return;
    await get().checkStatusFor(mobile);
  },

  showPending(mobileNo) {
    // Remembered here as well as after a submission: a driver whose account
    // predates the registration flow reaches this popup without ever having
    // submitted from this device, and the next launch should still know which
    // number to ask about.
    Preference.savePendingRegistration(mobileNo);
    set({ outcome: { kind: 'pending', message: Strings.registerWaitingMessage } });
  },

  showRegistrationRequired() {
    // Nothing to remember: there is no submission to ask the server about on
    // the next launch, which is exactly what this popup is telling them.
    set({ outcome: { kind: 'required', message: Strings.registerRequiredMessage } });
  },

  showAlreadyRegistered(message) {
    set({
      outcome: {
        kind: 'approved',
        message: message?.trim() || Strings.registerApprovedMessage,
      },
    });
  },

  async checkStatusFor(mobileNo) {
    set({ isCheckingStatus: true });
    try {
      const info = await RegistrationRepository.status(mobileNo);
      set({ isCheckingStatus: false });
      if (!info) return null;

      if (info.status === 'Approved') {
        // The decision has been delivered; there is nothing left to wait for,
        // so stop asking on every launch. From here the driver just logs in.
        Preference.clearPendingRegistration();
        set({
          outcome: { kind: 'approved', message: Strings.registerApprovedMessage },
        });
      } else if (info.status === 'Rejected') {
        // Kept, not cleared: a rejected driver may correct their details and
        // register again, and the reason has to survive until they have read it.
        Preference.clearPendingRegistration();
        set({
          outcome: {
            kind: 'rejected',
            message: Strings.registerRejectedMessage,
            reason: info.rejectionReason,
          },
        });
      } else {
        set({
          outcome: { kind: 'pending', message: Strings.registerWaitingMessage },
        });
      }
      return info.status;
    } catch {
      // A failed check is not worth a popup — the driver did nothing wrong and
      // the next launch asks again.
      set({ isCheckingStatus: false });
      return null;
    }
  },

  showPushedDecision(status, reason) {
    if (status === 'Approved') {
      Preference.clearPendingRegistration();
      set({ outcome: { kind: 'approved', message: Strings.registerApprovedMessage } });
    } else if (status === 'Rejected') {
      Preference.clearPendingRegistration();
      set({
        outcome: {
          kind: 'rejected',
          message: Strings.registerRejectedMessage,
          reason: reason?.trim() || undefined,
        },
      });
    }
  },

  dismissOutcome: () => set({ outcome: null }),

  reset: () =>
    set({
      form: { ...EMPTY_FORM },
      errors: {},
      isSubmitting: false,
      submitError: null,
      vehicleInfo: null,
      vehicleLookup: 'idle',
      licenceInfo: null,
      licenceLookup: 'idle',
    }),
}));

/**
 * Masks typed digits into "YYYY-MM-DD" as the driver types. A date picker
 * would mean a new native module and therefore a full rebuild; the licence
 * DOB is a number people know by heart, so typing it is no hardship.
 */
export function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** Uppercases and strips punctuation as the driver types a vehicle number. */
export function formatVehicleInput(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 11);
}

/** Licence numbers are written with a space; keep one but normalise the case. */
export function formatLicenceInput(raw: string): string {
  return raw.replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, 20);
}
