/**
 * Drives the registration screen, the waiting screen, and the popups the flow
 * can end in.
 *
 * Waiting is a place, not a popup: `pendingMobile` and `statusInfo` are what
 * the waiting screen renders, and every path that discovers a Pending
 * registration fills them in and lets its screen route there. `outcome` is
 * only for the three things that are genuinely momentary — a decision, a
 * duplicate, a number that never registered.
 *
 * Both live here rather than in any one screen because several raise them: the
 * register screen after a submit, the login and waiting screens after a status
 * check, and the root layout after a decision push.
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
  RegistrationStatusInfo,
  VehicleInfo,
} from '@/types/registration';

export type FieldKey = keyof RegistrationForm;

/**
 * Which popup to show, and the words to put in it. There is deliberately no
 * 'pending' kind: waiting on the admin is the waiting screen's whole job, and
 * a popup saying the same thing would only cover it.
 */
export interface RegistrationOutcome {
  /**
   * 'exists' is the only one that is a refusal: the vehicle or licence typed
   * into the form is on somebody else's record. 'hasAccount' is its opposite
   * in tone — the record it collided with is the driver's own, so the answer
   * is "go and log in", not "fix this". Keeping them apart is what stops a
   * registration error being announced with a green tick.
   */
  kind: 'required' | 'approved' | 'rejected' | 'exists' | 'hasAccount';
  message: string;
  /** Admin's reason — only ever set for 'rejected'. */
  reason?: string;
}

/** What a status check settled on, for the caller that has to route on it. */
export type StatusCheck = RegistrationStatus | 'none' | 'unknown';

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

  /**
   * The number whose registration is awaiting a decision — mirrored from
   * Preference so the waiting screen can re-check without reading storage.
   */
  pendingMobile: string | null;
  /** The last thing the server said about it; what the waiting screen shows. */
  statusInfo: RegistrationStatusInfo | null;
  /** When that last check ran, so the screen can say how fresh it is. */
  lastCheckedAt: number | null;
  /** True when the most recent check could not reach the server. */
  checkFailed: boolean;

  setField: (key: FieldKey, value: string) => void;
  validate: () => boolean;
  /**
   * Files the form. 'needs-otp' is the server saying the mobile verification
   * has gone stale — nothing about the form is wrong, so the screen sends them
   * through the OTP step again rather than leaving them reading red text with
   * no button to press.
   */
  submit: () => Promise<'submitted' | 'needs-otp' | 'failed'>;

  lookupVehicle: () => Promise<void>;
  lookupLicence: () => Promise<void>;
  /**
   * Runs whichever of the two lookups has not succeeded yet and reports
   * whether both now have. Resolves false with the reason in submitError,
   * which is where the form shows it.
   */
  confirmDetails: () => Promise<boolean>;

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

  /**
   * Launch-time check for whichever number last submitted a registration.
   * Answers where the splash screen should send them; 'none' means this device
   * has no registration waiting, which is the common case.
   */
  checkPendingStatus: () => Promise<RegistrationStatus | 'none'>;
  /** Same check for a number the driver just typed on the login screen. */
  checkStatusFor: (mobileNo: string) => Promise<StatusCheck>;
  /**
   * Mark a registration already known to be Pending, for the callers that have
   * just read the status themselves — checkStatusFor would only fetch it a
   * second time to reach the same place. The caller routes to the waiting
   * screen; this fills in what that screen renders.
   */
  showPending: (mobileNo: string, info?: RegistrationStatusInfo) => void;
  /**
   * Forget the registration being waited on — once its decision has been
   * delivered, or once the server says the record is gone.
   */
  clearPending: () => void;
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

/**
 * Whether there is work in the form worth protecting — anything the driver
 * typed, as opposed to the mobile number the flow puts there for them.
 */
const isFormStarted = (f: RegistrationForm): boolean =>
  [f.driverName, f.vehicleNumber, f.driverLicenceNumber, f.dob].some(
    (v) => v.trim() !== '',
  );

/** Whether a field is complete enough to be worth a ULIP round trip. */
const vehicleReady = (f: RegistrationForm) => VEHICLE_RE.test(compact(f.vehicleNumber));
const licenceReady = (f: RegistrationForm) =>
  LICENCE_RE.test(compact(f.driverLicenceNumber)) && isRealDate(f.dob);

/**
 * The lookup currently in flight, if any. Held outside the store because a
 * promise is not state — nothing renders it — and because what it is for is
 * letting submit await the very lookup the driver's blur already started,
 * instead of firing a second one or giving up on a result that is seconds away.
 */
let vehicleInFlight: Promise<void> | null = null;
let licenceInFlight: Promise<void> | null = null;

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

  pendingMobile: null,
  statusInfo: null,
  lastCheckedAt: null,
  checkFailed: false,

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
    // Hand back the running one rather than starting a second or returning
    // immediately: submit awaits this to find out whether the vehicle is
    // confirmed, and a lookup the driver's own blur kicked off a moment
    // earlier is the very one it needs to wait for.
    if (vehicleInFlight) return vehicleInFlight;

    const { form } = get();
    if (!vehicleReady(form)) return;

    set({ vehicleLookup: 'loading' });
    vehicleInFlight = (async () => {
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
    })().finally(() => {
      vehicleInFlight = null;
    });

    return vehicleInFlight;
  },

  async lookupLicence() {
    if (licenceInFlight) return licenceInFlight;

    const { form } = get();
    if (!licenceReady(form)) return;

    set({ licenceLookup: 'loading' });
    licenceInFlight = (async () => {
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
    })().finally(() => {
      licenceInFlight = null;
    });

    return licenceInFlight;
  },

  async confirmDetails() {
    set({ submitError: null });

    // Twice at most. A second round is only ever needed for the one race this
    // has: an edit landing while a lookup was in flight leaves that lookup
    // discarding its own result, and the state back at idle rather than at an
    // answer. A genuine 'failed' breaks out immediately.
    for (let attempt = 0; attempt < 2; attempt++) {
      const pending: Promise<void>[] = [];
      if (get().vehicleLookup !== 'done') pending.push(get().lookupVehicle());
      if (get().licenceLookup !== 'done') pending.push(get().lookupLicence());
      if (pending.length > 0) await Promise.all(pending);

      const { vehicleLookup, licenceLookup } = get();
      if (vehicleLookup === 'done' && licenceLookup === 'done') return true;
      if (vehicleLookup === 'failed' || licenceLookup === 'failed') break;
    }

    const { vehicleLookup, licenceLookup } = get();
    set({
      submitError:
        vehicleLookup !== 'done' && licenceLookup !== 'done'
          ? Strings.registerConfirmBoth
          : vehicleLookup !== 'done'
            ? Strings.registerConfirmVehicle
            : Strings.registerConfirmLicence,
    });
    return false;
  },

  async submit() {
    if (!get().validate()) return 'failed';

    // Both numbers have to be confirmed by ULIP before this reaches the admin.
    // The form's own rules only prove the shape of what was typed; whether a
    // vehicle and a licence actually exist is what these two answer, and a
    // request the admin cannot check is worth less than one the driver was
    // asked to correct while they still had the form in front of them.
    if (!(await get().confirmDetails())) return 'failed';

    set({ isSubmitting: true, submitError: null });
    const { form } = get();
    try {
      const res = await RegistrationRepository.register(form);
      set({ isSubmitting: false });
      if (!isSuccess(res)) {
        set({ submitError: res?.message ?? Strings.somethingWentWrong });
        return 'failed';
      }

      // Remember the number so the next launch can ask what the admin decided
      // without making the driver type it again.
      Preference.savePendingRegistration(form.mobileNo);
      // Seeded from the form rather than fetched back: the waiting screen can
      // show what was just submitted immediately, and the first status check
      // it runs replaces this with the server's own copy.
      set({
        pendingMobile: form.mobileNo,
        statusInfo: {
          status: 'Pending',
          driverName: form.driverName.trim(),
          vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
          driverLicenceNumber: form.driverLicenceNumber.trim(),
          submittedAt: new Date().toISOString(),
        },
        lastCheckedAt: null,
        checkFailed: false,
        outcome: null,
      });
      return 'submitted';
    } catch (e) {
      set({ isSubmitting: false });

      // 409 — this vehicle or licence is already on file. The server puts the
      // record's status and whose number it is in `data`, which is enough to
      // tell the two very different meanings apart.
      if (e instanceof UnauthorisedException && e.status === 409) {
        const conflict = e.data as
          | { status?: RegistrationStatus; mobileNo?: string }
          | undefined;

        // Their own registration, already filed. Reached by submitting twice —
        // the second tap of a double press, or a driver who came back to the
        // form. Nothing has gone wrong for them, so say where it stands rather
        // than accusing them of registering someone else's vehicle.
        if (conflict?.status === 'Pending' && conflict.mobileNo === form.mobileNo) {
          // Seeded from the form so the waiting screen has a name to show
          // immediately; its own status check fills in the rest, submitted
          // date included, which is the one thing the form cannot know.
          get().showPending(form.mobileNo, {
            status: 'Pending',
            driverName: form.driverName.trim(),
            vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
            driverLicenceNumber: form.driverLicenceNumber.trim(),
          });
          return 'submitted';
        }

        // The other record is theirs, and already approved: they have an
        // account and are filling in a form they no longer need. Their own
        // good news, so it keeps the friendly popup and the way into it.
        if (conflict?.mobileNo === form.mobileNo) {
          set({
            outcome: {
              kind: 'hasAccount',
              message: e.message?.trim() || Strings.registerExistsMessage,
            },
          });
          return 'failed';
        }

        // Someone else's vehicle or licence. Nothing about this is approval —
        // it is the form being refused, and the popup has to say so, with the
        // server's line about which of the two is already on file.
        set({
          outcome: {
            kind: 'exists',
            message: e.message?.trim() || Strings.registerExistsMessage,
          },
        });
        return 'failed';
      }

      // 401 — the server will not take the form because the mobile is not
      // proved. Two quite different things arrive as this one status.
      if (e instanceof UnauthorisedException && e.status === 401) {
        // The first is a submission that already went through: a verification
        // is spent by the registration it files, so submitting a second time
        // fails exactly like an expired one. Asking the server what it holds
        // for this number tells them apart, and a registration already on file
        // is not an error at all — it is the waiting screen.
        const filed = await RegistrationRepository.status(form.mobileNo).catch(() => null);
        if (filed?.status === 'Pending') {
          get().showPending(form.mobileNo, filed);
          return 'submitted';
        }
        if (filed?.status === 'Approved') {
          set({
            outcome: { kind: 'approved', message: Strings.registerApprovedMessage },
          });
          return 'failed';
        }

        // The second is the real lapse: the verification is good for fifteen
        // minutes, and a driver waiting on the two ULIP lookups can outlast
        // it. Nothing is wrong with what they typed, so the form keeps every
        // field and the screen walks them back through the OTP step.
        set({ submitError: e.message?.trim() || Strings.registerVerifyExpired });
        return 'needs-otp';
      }

      if (e instanceof UnauthorisedException) {
        set({ submitError: e.message?.trim() || Strings.somethingWentWrong });
        return 'failed';
      }

      set({ submitError: Strings.somethingWentWrong });
      return 'failed';
    }
  },

  async verifyOtp(mobileNo, otp) {
    set({ isCheckingStatus: true });
    try {
      const info = await RegistrationRepository.verifyOtp(mobileNo, otp);

      // A form already filled in for this same number is one the driver is
      // re-verifying, not starting: the 15-minute window lapsed while they
      // were on it, and blanking their work to hand back the number they
      // never stopped having would be the rudest possible reading of success.
      const keepForm = get().form.mobileNo === mobileNo && isFormStarted(get().form);

      // However this turns out, the number is now proved. Seeding the form
      // with it means the driver never retypes it and cannot submit under a
      // different one than the OTP went to.
      set({
        isCheckingStatus: false,
        submitError: null,
        ...(keepForm
          ? {}
          : {
              form: { ...EMPTY_FORM, mobileNo },
              errors: {},
              vehicleInfo: null,
              vehicleLookup: 'idle' as LookupState,
              licenceInfo: null,
              licenceLookup: 'idle' as LookupState,
            }),
      });

      if (!info) return 'form';

      if (info.status === 'Approved') {
        get().clearPending();
        set({ outcome: { kind: 'approved', message: Strings.registerApprovedMessage } });
        return 'approved';
      }

      if (info.status === 'Rejected') {
        get().clearPending();
        // Carry the rejected details back into the form: correcting one wrong
        // digit should not mean typing all of it again. Skipped when the
        // driver is re-verifying a form they are already partway through
        // correcting, which would otherwise undo those corrections.
        set({
          ...(keepForm
            ? {}
            : {
                form: {
                  ...EMPTY_FORM,
                  mobileNo,
                  driverName: info.driverName ?? '',
                  vehicleNumber: info.vehicleNumber ?? '',
                  driverLicenceNumber: info.driverLicenceNumber ?? '',
                },
              }),
          // Deliberately no popup. This one path ends on the form rather than
          // at a dead end, and the rejection popup's only button goes back to
          // login — which would throw away the very form it just filled in.
          // The reason rides along in statusInfo, and the form prints it above
          // the fields, where it is of use while they are being corrected.
          statusInfo: info,
        });
        return 'rejected';
      }

      // Already waiting on a decision. Nothing to fill in, so the OTP screen
      // sends them to the waiting screen rather than the form.
      get().showPending(mobileNo, info);
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
    if (!mobile) return 'none';

    // Set before the call so the waiting screen has a number to re-check with
    // even when this first attempt is the one that fails.
    set({ pendingMobile: mobile });
    const result = await get().checkStatusFor(mobile);

    if (result === 'none') {
      // The server has no record of it any more. Stop asking on every launch.
      get().clearPending();
      return 'none';
    }
    // A check that could not be completed — offline at launch, most likely —
    // is not evidence that the decision has come. Keep them on the waiting
    // screen, which says so and offers to try again.
    if (result === 'unknown') return 'Pending';
    return result;
  },

  showPending(mobileNo, info) {
    // Remembered here as well as after a submission: a driver whose account
    // predates the registration flow reaches the waiting screen without ever
    // having submitted from this device, and the next launch should still
    // know which number to ask about.
    Preference.savePendingRegistration(mobileNo);
    set({
      pendingMobile: mobileNo,
      // Only keep what is already held if it belongs to this number, or the
      // screen would show one driver's details under another's registration.
      statusInfo: info ?? (get().pendingMobile === mobileNo ? get().statusInfo : null),
      checkFailed: false,
      outcome: null,
    });
  },

  clearPending() {
    Preference.clearPendingRegistration();
    set({ pendingMobile: null, statusInfo: null, lastCheckedAt: null, checkFailed: false });
  },

  showRegistrationRequired() {
    // Nothing to remember: there is no submission to ask the server about on
    // the next launch, which is exactly what this popup is telling them.
    set({ outcome: { kind: 'required', message: Strings.registerRequiredMessage } });
  },

  showAlreadyRegistered(message) {
    set({
      outcome: {
        kind: 'hasAccount',
        message: message?.trim() || Strings.registerApprovedMessage,
      },
    });
  },

  async checkStatusFor(mobileNo) {
    set({ isCheckingStatus: true });
    try {
      const info = await RegistrationRepository.status(mobileNo);
      set({ isCheckingStatus: false, lastCheckedAt: Date.now(), checkFailed: false });
      if (!info) return 'none';

      // Held whatever the answer, so the waiting screen keeps rendering the
      // registration underneath the popup that announces its decision.
      set({ statusInfo: info });

      if (info.status === 'Approved') {
        // The decision has been delivered; there is nothing left to wait for,
        // so stop asking on every launch. From here the driver just logs in.
        Preference.clearPendingRegistration();
        set({
          outcome: { kind: 'approved', message: Strings.registerApprovedMessage },
        });
      } else if (info.status === 'Rejected') {
        // The record itself is kept — a rejected driver may correct their
        // details and register again, and the reason has to survive until they
        // have read it. Only the "ask again on every launch" note goes.
        Preference.clearPendingRegistration();
        set({
          outcome: {
            kind: 'rejected',
            message: Strings.registerRejectedMessage,
            reason: info.rejectionReason,
          },
        });
      }
      // Pending raises nothing: the waiting screen is already saying it.
      return info.status;
    } catch {
      // A failed check is not worth a popup — the driver did nothing wrong.
      // `checkFailed` lets the waiting screen say so and offer another go.
      set({ isCheckingStatus: false, checkFailed: true });
      return 'unknown';
    }
  },

  showPushedDecision(status, reason) {
    if (status !== 'Approved' && status !== 'Rejected') return;

    Preference.clearPendingRegistration();
    const info = get().statusInfo;
    set({
      // Kept in step with the popup, so the waiting screen behind it is not
      // still calling a decided registration pending.
      statusInfo: info
        ? { ...info, status, rejectionReason: reason?.trim() || info.rejectionReason }
        : info,
      outcome:
        status === 'Approved'
          ? { kind: 'approved', message: Strings.registerApprovedMessage }
          : {
              kind: 'rejected',
              message: Strings.registerRejectedMessage,
              reason: reason?.trim() || undefined,
            },
    });
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
