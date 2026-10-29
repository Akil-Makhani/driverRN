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
import * as ImagePicker from 'expo-image-picker';
import { create } from 'zustand';

import { UnauthorisedException } from '@/core/api/errors';
import { RegistrationRepository } from '@/core/services/registration-repository';
import { Preference } from '@/core/storage/preference';
import { Strings } from '@/core/constants/strings';
import { toAsciiDigits } from '@/core/utils/number-format';
import { isSuccess } from '@/types/api';
import { REGISTRATION_DOCUMENT_KEYS, isRegistrationComplete } from '@/types/registration';
import type {
  DriverLicenceInfo,
  RegistrationPhotoKey,
  RegistrationForm,
  RegistrationStatus,
  RegistrationStatusInfo,
  VehicleInfo,
} from '@/types/registration';

/** The typed fields — everything on the form except the photo keys. */
export type FieldKey = Exclude<keyof RegistrationForm, 'documents'>;

/**
 * One of the four document photos. `uri` is the local picture shown in the
 * slot; the S3 key it uploads to lives on `form.documents`, which is what
 * submit sends. Kept apart because a photo can be on screen and not yet
 * uploaded — picked offline, or refused by a lapsed OTP verification.
 */
export interface PhotoSlot {
  uri?: string;
  mimeType?: string;
  status: 'idle' | 'uploading' | 'done' | 'failed';
}

export type PhotoSource = 'camera' | 'library';

const EMPTY_PHOTOS = (): Record<RegistrationPhotoKey, PhotoSlot> => ({
  dlFront: { status: 'idle' },
  dlBack: { status: 'idle' },
  rcFront: { status: 'idle' },
  rcBack: { status: 'idle' },
  // Optional: the driver's own photo, for the dashboard.
  profilePhoto: { status: 'idle' },
});

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

  photos: Record<RegistrationPhotoKey, PhotoSlot>;
  /** Shown under the photo grid — a missing photo or a failed upload. */
  photoError: string | null;

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

  /**
   * Set when the registration on file is only a verified mobile number — the
   * driver skipped the details step. Read off statusInfo rather than stored
   * separately would mean every screen repeating the same fallback, and the
   * one place it matters (the waiting screen) needs it on every render.
   */
  isDetailsPending: boolean;

  /**
   * True when nothing has reached the server yet — the number is verified and
   * the details are outstanding, but the deployment has no endpoint to file
   * that half-registration with, so this phone is the only thing that knows.
   *
   * It changes two things. The form must POST the whole registration rather
   * than PATCH a record that does not exist; and the waiting screen must not
   * claim a decision is coming, because nobody has been asked for one. Both
   * resolve themselves the moment the driver submits the form.
   */
  isLocalDraft: boolean;

  setField: (key: FieldKey, value: string) => void;
  validate: () => boolean;
  /**
   * Files the form. 'needs-otp' is the server saying the mobile verification
   * has gone stale — nothing about the form is wrong, so the screen sends them
   * through the OTP step again rather than leaving them reading red text with
   * no button to press.
   */
  submit: () => Promise<'submitted' | 'needs-otp' | 'failed'>;

  /**
   * Files the registration on the number alone, the moment its OTP verifies.
   * From here the driver may fill the form in, skip it, or close the app, and
   * still come back to a flow that remembers where they were — which is the
   * whole point: the details step is no longer the thing standing between a
   * driver and having started.
   *
   * Where "filed" happens depends on the deployment. A server carrying
   * /registration/start takes it, and the record is real from this moment. One
   * that does not answers 404, and the same fact is kept on the phone instead
   * (see isLocalDraft) — so the skip works either way, and the only difference
   * is whether an admin can see the driver before the form is submitted.
   *
   * Resolves false only when neither could be done, which leaves the caller on
   * the form with no skip offered — the old single-submit flow, unchanged.
   */
  startRegistration: (mobileNo: string) => Promise<boolean>;

  /**
   * Fills the form in from the registration being waited on, for the driver
   * returning to complete details they skipped. Without this the form opens
   * blank on a fresh launch — including its locked mobile field, which is the
   * one value it cannot ask for, since editing it would undo the verification
   * that filed the registration in the first place.
   *
   * Anything the driver has already typed this session wins: they may have
   * been partway through the form when they backed out of it, and the record
   * on file has nothing better to offer than what is in front of them.
   */
  prepareDetailsForm: () => void;

  lookupVehicle: () => Promise<void>;
  lookupLicence: () => Promise<void>;

  /** Takes or chooses a photo for one slot and starts uploading it. */
  pickPhoto: (key: RegistrationPhotoKey, source: PhotoSource) => Promise<void>;
  /**
   * Uploads one picked photo. 'needs-otp' is the server refusing because the
   * mobile verification has lapsed — the same ending submit has.
   */
  uploadPhoto: (key: RegistrationPhotoKey) => Promise<'done' | 'needs-otp' | 'failed'>;

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
  documents: {},
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
  ) || Object.keys(f.documents).length > 0;

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

  photos: EMPTY_PHOTOS(),
  photoError: null,

  outcome: null,
  isCheckingStatus: false,

  pendingMobile: null,
  statusInfo: null,
  lastCheckedAt: null,
  checkFailed: false,
  isDetailsPending: false,
  isLocalDraft: false,

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
    // All four photos are compulsory. Picked is enough here — submit uploads
    // whichever have not gone up yet.
    const photos = get().photos;
    const photosMissing = REGISTRATION_DOCUMENT_KEYS.some((k) => !photos[k].uri);
    set({ errors, photoError: photosMissing ? Strings.registerPhotosRequired : null });
    return Object.keys(errors).length === 0 && !photosMissing;
  },

  async pickPhoto(key, source) {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      set({ photoError: Strings.registerPhotoPermission });
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      // A document photo only has to be legible; 0.6 keeps a 12MP shot to a
      // few hundred KB, which matters on a weak connection at a truck stand.
      quality: 0.6,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    // A new photo replaces the old one, including its uploaded key: the key
    // would otherwise go on describing a picture that is no longer on screen.
    const documents = { ...get().form.documents };
    delete documents[key];
    set({
      form: { ...get().form, documents },
      photos: {
        ...get().photos,
        [key]: { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg', status: 'idle' },
      },
      photoError: null,
      submitError: null,
    });
    await get().uploadPhoto(key);
  },

  async uploadPhoto(key) {
    const slot = get().photos[key];
    if (!slot.uri) return 'failed';
    if (slot.status === 'done' && get().form.documents[key]) return 'done';

    const setSlot = (status: PhotoSlot['status']) =>
      set({ photos: { ...get().photos, [key]: { ...get().photos[key], status } } });

    setSlot('uploading');
    try {
      const fileKey = await RegistrationRepository.uploadDocument(
        get().form.mobileNo,
        key,
        slot.uri,
        slot.mimeType ?? 'image/jpeg',
      );
      // Re-picked while this was in flight: the newer photo's own upload owns
      // the slot now, and this key belongs to a picture nobody can see.
      if (get().photos[key].uri !== slot.uri) return 'failed';
      set({ form: { ...get().form, documents: { ...get().form.documents, [key]: fileKey } } });
      setSlot('done');
      return 'done';
    } catch (e) {
      if (get().photos[key].uri !== slot.uri) return 'failed';
      setSlot('failed');
      if (e instanceof UnauthorisedException && e.statusCode === 401) return 'needs-otp';
      return 'failed';
    }
  },

  async startRegistration(mobileNo) {
    // Whether the server has a record of this, which is what tells the rest of
    // the flow apart: with one, the form completes it and the waiting screen
    // may expect a decision; without, the phone is the only thing that knows
    // and the form still has the whole registration to send.
    let onServer = false;

    try {
      const res = await RegistrationRepository.start(mobileNo);
      onServer = isSuccess(res);
    } catch (e) {
      if (e instanceof UnauthorisedException && e.statusCode === 409) {
        // Already on file, by an earlier attempt or by a driver coming back to
        // a registration they left unfinished. Not a failure of this step but
        // this step already done, so the only open question is how much of it
        // is filled in. Asking is worth the round trip: assuming empty would
        // have the waiting screen demand details the driver has already given,
        // which is the one thing that state must never do.
        const filed = await RegistrationRepository.status(mobileNo).catch(() => null);
        if (filed) {
          Preference.clearDetailsPending();
          get().showPending(mobileNo, filed);
          return true;
        }
        // On file but unreadable. Treat it as unfinished, which is what
        // brought them here; the next status check settles it either way.
        onServer = true;
      }
      // Anything else — a 404 from a deployment without this endpoint, a dead
      // network — leaves onServer false and falls through to the local draft.
      // Deliberately not told apart: what the driver needs is the same in
      // every case, and it is the one thing this can still give them.
    }

    // Kept whichever way it went, because both are a registration in progress
    // that the next launch has to find. The difference is only where the rest
    // of it lives.
    Preference.saveDetailsPending(mobileNo);
    if (onServer) Preference.savePendingRegistration(mobileNo);

    set({
      pendingMobile: mobileNo,
      statusInfo: {
        status: 'Pending',
        // Nothing has been filled in yet, which is precisely what the waiting
        // screen has to know: it asks for the details instead of promising a
        // decision. A later status check replaces this with the server's copy.
        isComplete: false,
      },
      isDetailsPending: true,
      isLocalDraft: !onServer,
      lastCheckedAt: null,
      checkFailed: false,
      outcome: null,
    });
    return true;
  },

  prepareDetailsForm() {
    const { pendingMobile, statusInfo, form } = get();
    if (!pendingMobile) return;

    set({
      form: {
        ...form,
        mobileNo: pendingMobile,
        driverName: form.driverName || statusInfo?.driverName || '',
        vehicleNumber: form.vehicleNumber || statusInfo?.vehicleNumber || '',
        driverLicenceNumber:
          form.driverLicenceNumber || statusInfo?.driverLicenceNumber || '',
      },
      errors: {},
      submitError: null,
    });
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

  async submit() {
    if (!get().validate()) return 'failed';

    set({ isSubmitting: true, submitError: null });

    // The ULIP lookups no longer gate this. The gateway is down more often
    // than not, and the four photos are what the admin checks the numbers
    // against when it is — so with all four in, the registration goes through
    // whether or not the panels above managed to fetch anything. The server
    // makes its own best-effort ULIP call when it files the record.
    //
    // What does gate it is every photo being uploaded: any that failed or
    // never started (picked offline) get one more go here.
    for (const key of REGISTRATION_DOCUMENT_KEYS) {
      const uploaded = await get().uploadPhoto(key);
      if (uploaded === 'needs-otp') {
        set({ isSubmitting: false, submitError: Strings.registerVerifyExpired });
        return 'needs-otp';
      }
      if (uploaded === 'failed') {
        set({ isSubmitting: false, photoError: Strings.registerPhotoUploadFailed });
        return 'failed';
      }
    }
    // The driver's own photo is optional, so one that will not go up is left
    // out rather than holding the registration back.
    if (get().photos.profilePhoto.uri && (await get().uploadPhoto('profilePhoto')) !== 'done') {
      const { profilePhoto: _dropped, ...documents } = get().form.documents;
      set({ form: { ...get().form, documents } });
    }

    const { form } = get();
    try {
      // Two ways in, settled by whether the server holds a record to complete.
      // A local draft has none — the OTP step could not file one — so it takes
      // the POST that files the whole registration, which is also the path for
      // any deployment without the two-step endpoints.
      const completing =
        !get().isLocalDraft &&
        get().pendingMobile === form.mobileNo &&
        get().statusInfo != null;
      const res = completing
        ? await RegistrationRepository.submitDetails(form.mobileNo, form)
        : await RegistrationRepository.register(form);
      set({ isSubmitting: false });
      if (!isSuccess(res)) {
        set({ submitError: res?.message ?? Strings.somethingWentWrong });
        return 'failed';
      }

      // Remember the number so the next launch can ask what the admin decided
      // without making the driver type it again.
      Preference.savePendingRegistration(form.mobileNo);
      // Whatever was outstanding is now submitted, on the server, and asked
      // after by the pending mobile above — so the local note has nothing left
      // to remember and would only re-raise a prompt that has been answered.
      Preference.clearDetailsPending();
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
          // Kept from the record this completes, so the waiting screen still
          // says when the driver joined the queue rather than resetting it to
          // the moment they finally filled the form in.
          submittedAt: get().statusInfo?.submittedAt ?? new Date().toISOString(),
          isComplete: true,
        },
        // The details are in. Whatever brought them here, the waiting screen
        // stops asking for them, and the registration is now the server's.
        isDetailsPending: false,
        isLocalDraft: false,
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
      if (e instanceof UnauthorisedException && e.statusCode === 409) {
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
          //
          // A POST that collides with the driver's own record is a record that
          // already carries these details — the second tap of a double press,
          // or a return to a form that went through. Complete, therefore, and
          // marked so, or the waiting screen would ask for what it just sent.
          get().showPending(form.mobileNo, {
            status: 'Pending',
            driverName: form.driverName.trim(),
            vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
            driverLicenceNumber: form.driverLicenceNumber.trim(),
            isComplete: true,
          });
          Preference.clearDetailsPending();
          set({ isLocalDraft: false });
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
      if (e instanceof UnauthorisedException && e.statusCode === 401) {
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
              photos: EMPTY_PHOTOS(),
              photoError: null,
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
          // A rejected registration is being corrected, not completed — the
          // form is open on it, so nothing should be asking for details.
          isDetailsPending: false,
          isLocalDraft: false,
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
    // A registration this phone started but could not file — the OTP was
    // verified and the form skipped on a deployment with nowhere to put that.
    // Looked at first because the two can both be set, and the filed one is
    // the better answer whenever it is.
    const draft = Preference.getDetailsPending();

    if (!mobile) {
      if (!draft) return 'none';

      // Nothing to ask the server about this number, except whether it has
      // since become a registration in its own right — an admin entering it,
      // or the driver finishing the form on another phone. Worth one call,
      // because the alternative is asking a driver to fill in details that are
      // already held.
      const filed = await RegistrationRepository.status(draft).catch(() => null);
      if (filed) {
        Preference.clearDetailsPending();
        get().showPending(draft, filed);
        return filed.status;
      }

      // Still only this phone's word for it, which is the ordinary case and
      // exactly what the waiting screen is for: it will ask for the details.
      set({
        pendingMobile: draft,
        statusInfo: { status: 'Pending', isComplete: false },
        isDetailsPending: true,
        isLocalDraft: true,
        lastCheckedAt: null,
        checkFailed: false,
      });
      return 'Pending';
    }

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
    // Only keep what is already held if it belongs to this number, or the
    // screen would show one driver's details under another's registration.
    const kept = info ?? (get().pendingMobile === mobileNo ? get().statusInfo : null);
    set({
      pendingMobile: mobileNo,
      statusInfo: kept,
      isDetailsPending: kept != null && !isRegistrationComplete(kept),
      // Reached with a record the server answered for, so whatever this phone
      // was holding on its own has been superseded by the real thing.
      isLocalDraft: false,
      checkFailed: false,
      outcome: null,
    });
  },

  clearPending() {
    Preference.clearPendingRegistration();
    Preference.clearDetailsPending();
    set({
      pendingMobile: null,
      statusInfo: null,
      lastCheckedAt: null,
      checkFailed: false,
      isDetailsPending: false,
      isLocalDraft: false,
    });
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
      // No record. For a local draft that is the expected answer, not a loss:
      // nothing was ever filed, and the draft this phone holds is left exactly
      // as it was so the waiting screen goes on asking for the details. The
      // callers that treat 'none' as "forget this number" only ever pass one
      // the server filed in the first place.
      if (!info) return 'none';

      // Held whatever the answer, so the waiting screen keeps rendering the
      // registration underneath the popup that announces its decision.
      //
      // This is also the authority on whether the details are in: a driver who
      // completed the form on another device, or an admin who filled it in for
      // them, both show up here and nowhere else — and either way the local
      // draft, which only ever stood in for an answer like this, is done.
      Preference.clearDetailsPending();
      set({
        statusInfo: info,
        isDetailsPending: !isRegistrationComplete(info),
        isLocalDraft: false,
      });

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
      // A decision has landed, so the details are no longer what this driver
      // is being asked for — whichever way it went, and even if they never
      // filled them in. The popup, not a form prompt, is what they act on now.
      isDetailsPending: false,
      isLocalDraft: false,
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
      photos: EMPTY_PHOTOS(),
      photoError: null,
    }),
}));

/**
 * Masks typed digits into "YYYY-MM-DD" as the driver types. A date picker
 * would mean a new native module and therefore a full rebuild; the licence
 * DOB is a number people know by heart, so typing it is no hardship.
 */
export function formatDobInput(raw: string): string {
  const digits = toAsciiDigits(raw).replace(/\D/g, '').slice(0, 8);
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
