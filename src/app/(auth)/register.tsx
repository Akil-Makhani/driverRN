/**
 * Driver self-registration — the screen a driver reaches from login when they
 * do not have an account yet, and the one it sends them back to when the
 * details are still outstanding.
 *
 * The registration itself is no longer made here: verifying the OTP files it,
 * on the number alone, and this fills in the rest. That is what makes SKIP
 * honest rather than a way of throwing the form away — a driver without their
 * papers to hand keeps their place in the queue and comes back to this screen
 * from the waiting screen, which goes on asking until the details are in.
 * Leaving by any route therefore lands on the waiting screen, never on login.
 *
 * Only the driver's name, the vehicle number and the tempo capacity are
 * required. The licence number, date of birth and the four document photos are optional
 * here: the driver adds them later from "Complete your details", and the
 * admin's trip limit (Tempo App Setting) decides when they become compulsory.
 *
 * The two detail panels are the point of the ULIP lookups: rather than making
 * the driver trust that they typed their vehicle and licence numbers
 * correctly, the form shows back whose vehicle and whose licence it matched
 * before they submit. They are a help, not a gate: ULIP is often unreachable.
 * A failed panel still offers TRY AGAIN.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoSourceSheet } from '@/components/photo-source-sheet';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { localDigits } from '@/core/i18n/language';
import { resetTo } from '@/core/navigation';
import { groupDigits } from '@/core/utils/number-format';
import { useAuthStore } from '@/features/auth/auth-store';
import {
  type FieldKey,
  type PhotoSlot,
  formatCapacityInput,
  formatDobInput,
  formatLicenceInput,
  formatVehicleInput,
  useRegistrationStore,
} from '@/features/auth/registration-store';
import {
  REGISTRATION_DOCUMENT_KEYS,
  type RegistrationDocumentKey,
  type RegistrationPhotoKey,
} from '@/types/registration';

const MOBILE_LENGTH = 10;

/** Read at render time, never at module load — see core/constants/strings. */
const photoLabels = (): [RegistrationDocumentKey, string][] => [
  ['dlFront', Strings.registerPhotoDlFront],
  ['dlBack', Strings.registerPhotoDlBack],
  ['rcFront', Strings.registerPhotoRcFront],
  ['rcBack', Strings.registerPhotoRcBack],
];

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /**
   * The slot the camera / gallery sheet is open for. A driver at a truck
   * stand usually has the papers in hand, so both are offered.
   */
  const [sourceFor, setSourceFor] = useState<{ key: RegistrationPhotoKey; label: string } | null>(null);
  const choosePhotoSource = (key: RegistrationPhotoKey, label: string) => {
    Keyboard.dismiss();
    setSourceFor({ key, label });
  };

  const form = useRegistrationStore((s) => s.form);
  const errors = useRegistrationStore((s) => s.errors);
  const isSubmitting = useRegistrationStore((s) => s.isSubmitting);
  const submitError = useRegistrationStore((s) => s.submitError);
  const vehicleInfo = useRegistrationStore((s) => s.vehicleInfo);
  const vehicleLookup = useRegistrationStore((s) => s.vehicleLookup);
  const licenceInfo = useRegistrationStore((s) => s.licenceInfo);
  const licenceLookup = useRegistrationStore((s) => s.licenceLookup);
  const photos = useRegistrationStore((s) => s.photos);
  const photoError = useRegistrationStore((s) => s.photoError);
  // Every photo is optional; submit only waits while one is still going up.
  const anyUploading = [...REGISTRATION_DOCUMENT_KEYS, 'profilePhoto' as const].some(
    (k) => photos[k].status === 'uploading',
  );
  // Set when this form was opened carrying a rejected registration's details.
  const statusInfo = useRegistrationStore((s) => s.statusInfo);
  // True once the OTP step has filed a registration this form is completing —
  // which is what makes leaving without submitting a "later" rather than an
  // abandonment, and so what SKIP and the back arrow are conditional on.
  const isDetailsPending = useRegistrationStore((s) => s.isDetailsPending);

  const set = (key: FieldKey) => (value: string) =>
    useRegistrationStore.getState().setField(key, value);

  /**
   * Everything that leaves this form without submitting it: SKIP, the back
   * arrow, and the link at the foot. Where it goes depends on whether there is
   * a registration behind the form — with one, the waiting screen is the
   * driver's home and the place that asks for these details again; without
   * one, nothing was filed and login is all there is.
   *
   * The form is deliberately not reset on the way out: coming back to a
   * half-typed vehicle number is worth more than a clean form, and the OTP
   * path blanks it for a genuinely new registration anyway.
   */
  const leaveForm = () => {
    useRegistrationStore.getState().dismissOutcome();
    if (useRegistrationStore.getState().pendingMobile) {
      router.replace('/(auth)/pending-approval');
      return;
    }
    useRegistrationStore.getState().reset();
    resetTo('/(auth)/login');
  };

  /**
   * A filed registration goes to the waiting screen, not back to login: there
   * is nothing on login for a driver who cannot log in yet, and the decision
   * arrives on the waiting screen. `replace`, so the form they have just sent
   * is not sitting one back-press behind it.
   *
   * 'needs-otp' is the other real ending: the mobile verification is good for
   * fifteen minutes and the two ULIP lookups can outlast it. The form is kept
   * exactly as typed and a fresh OTP is sent, so re-verifying is four digits
   * rather than the whole form again.
   */
  const onSubmit = async () => {
    Keyboard.dismiss();
    const result = await useRegistrationStore.getState().submit();

    if (result === 'submitted') {
      router.replace('/(auth)/pending-approval');
      return;
    }

    if (result === 'needs-otp') {
      const mobile = useRegistrationStore.getState().form.mobileNo;
      const sent = await useAuthStore.getState().startRegistration(mobile);
      if (!sent.ok) {
        // Could not even send the code. The submitError already on screen
        // says what went wrong; there is nowhere useful to send them.
        return;
      }
      useAuthStore.getState().resetOtp();
      useAuthStore.getState().startTimer();
      // `reverify` tells the OTP screen to come back here rather than open a
      // second copy of this screen on top of the one being filled in.
      router.push({ pathname: '/(auth)/otp', params: { mobile, reverify: '1' } });
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          {/* Deliberately not router.back(): behind this screen is the OTP
              screen and the number that has already been verified, which is
              not somewhere a driver can usefully return to. */}
          <Pressable onPress={leaveForm} hitSlop={10} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={AppColors.text} />
          </Pressable>
          <Text style={styles.title}>{Strings.registerTitle}</Text>
          <Text style={styles.subtitle}>{Strings.registerSubtitle}</Text>
        </View>

        <View style={styles.form}>
          {statusInfo?.status === 'Rejected' ? (
            <View style={styles.rejectedBanner}>
              <Text style={styles.rejectedTitle}>{Strings.registerRejectedBanner}</Text>
              {statusInfo.rejectionReason ? (
                <Text style={styles.rejectedReason}>
                  {`${Strings.registerRejectedReasonLabel}: ${statusInfo.rejectionReason}`}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Locked: this is the number the OTP was just sent to and verified,
              so letting it be edited here would undo the verification. */}
          <Field
            label={Strings.registerMobile}
            placeholder={localDigits('12345 67890')}
            value={localDigits(groupDigits(form.mobileNo))}
            onChangeText={() => {}}
            error={errors.mobileNo}
            keyboardType="number-pad"
            maxLength={11} // 10 digits + the group separator
            prefix={localDigits(`+ ${Strings.commonCountryCode}`)}
            editable={false}
            note={Strings.registerMobileVerified}
          />

          <Field
            label={`${Strings.registerDriverName} *`}
            placeholder={Strings.registerDriverNameHint}
            value={form.driverName}
            onChangeText={set('driverName')}
            error={errors.driverName}
            autoCapitalize="words"
          />

          <Field
            label={`${Strings.registerVehicleNumber} *`}
            placeholder={Strings.registerVehicleHint}
            value={form.vehicleNumber}
            onChangeText={(t) => set('vehicleNumber')(formatVehicleInput(t))}
            onBlur={() => void useRegistrationStore.getState().lookupVehicle()}
            error={errors.vehicleNumber}
            autoCapitalize="characters"
            busy={vehicleLookup === 'loading'}
          />

          <Field
            label={`${Strings.registerCapacity} *`}
            placeholder={localDigits(Strings.registerCapacityHint)}
            value={localDigits(form.vehicleCapacity)}
            onChangeText={(t) => set('vehicleCapacity')(formatCapacityInput(t))}
            error={errors.vehicleCapacity}
            keyboardType="number-pad"
            maxLength={5}
            suffix="KG"
            hint={Strings.registerCapacityNote}
          />

          <LookupPanel
            title={Strings.registerVehicleDetails}
            state={vehicleLookup}
            rows={
              vehicleInfo
                ? [
                    [Strings.registerOwner, vehicleInfo.ownerName],
                    [Strings.registerModel, vehicleInfo.makerModel],
                    [Strings.registerVehicleClass, vehicleInfo.vehicleClass],
                    [Strings.registerFitnessUpto, vehicleInfo.fitnessUpto],
                    [Strings.registerInsuranceUpto, vehicleInfo.insuranceUpto],
                  ]
                : []
            }
            onRetry={() => void useRegistrationStore.getState().lookupVehicle()}
          />

          {/* Everything below is optional now: it can follow from "Complete
              your details" before the admin's trip limit. */}
          <View style={styles.optionalHead}>
            <Text style={styles.optionalTitle}>{Strings.registerOptionalTitle}</Text>
            <Text style={styles.optionalNote}>{Strings.registerOptionalNote}</Text>
          </View>

          <Field
            label={Strings.registerLicenceNumber}
            placeholder={Strings.registerLicenceHint}
            value={form.driverLicenceNumber}
            onChangeText={(t) => set('driverLicenceNumber')(formatLicenceInput(t))}
            onBlur={() => void useRegistrationStore.getState().lookupLicence()}
            error={errors.driverLicenceNumber}
            autoCapitalize="characters"
          />

          <Field
            label={Strings.registerDob}
            placeholder={Strings.registerDobHint}
            value={localDigits(form.dob)}
            onChangeText={(t) => set('dob')(formatDobInput(t))}
            onBlur={() => void useRegistrationStore.getState().lookupLicence()}
            error={errors.dob}
            keyboardType="number-pad"
            maxLength={10}
            busy={licenceLookup === 'loading'}
          />

          <LookupPanel
            title={Strings.registerLicenceDetails}
            state={licenceLookup}
            rows={
              licenceInfo
                ? [
                    [Strings.registerLicenceHolder, licenceInfo.name],
                    [Strings.registerLicenceValidUpto, licenceInfo.validUpto],
                    [Strings.registerLicenceClasses, licenceInfo.vehicleClasses],
                    [Strings.registerRto, licenceInfo.rtoOffice],
                  ]
                : []
            }
            onRetry={() => void useRegistrationStore.getState().lookupLicence()}
          />

          {/* The driver's own photo, optional: shown on their dashboard once
              approved, the stock avatar otherwise. */}
          <View style={styles.field}>
            <Text style={styles.label}>{Strings.registerProfilePhotoTitle}</Text>
            <Text style={styles.photosNote}>{Strings.registerProfilePhotoNote}</Text>
            <ProfilePhotoPicker
              slot={photos.profilePhoto}
              onRemove={() => useRegistrationStore.getState().removePhoto('profilePhoto')}
              onPress={() => {
                if (photos.profilePhoto.status === 'failed') {
                  void useRegistrationStore.getState().uploadPhoto('profilePhoto');
                } else if (photos.profilePhoto.status !== 'uploading') {
                  choosePhotoSource('profilePhoto', Strings.registerProfilePhotoTitle);
                }
              }}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              {`${Strings.registerPhotosTitle} `}
              <Text style={styles.labelMuted}>{Strings.registerOptional}</Text>
            </Text>
            <Text style={styles.photosNote}>{Strings.registerPhotosNote}</Text>
            <View style={styles.photoGrid}>
              {photoLabels().map(([key, label]) => (
                <PhotoTile
                  key={key}
                  label={label}
                  slot={photos[key]}
                  onPress={() => {
                    // A failed upload retries in place; anything else picks
                    // (or re-picks) the photo.
                    if (photos[key].status === 'failed') {
                      void useRegistrationStore.getState().uploadPhoto(key);
                    } else if (photos[key].status !== 'uploading') {
                      choosePhotoSource(key, label);
                    }
                  }}
                  onChange={() => choosePhotoSource(key, label)}
                  onRemove={() => useRegistrationStore.getState().removePhoto(key)}
                />
              ))}
            </View>
            {photoError ? <Text style={styles.error}>{photoError}</Text> : null}
          </View>

          {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={isSubmitting || anyUploading}
            style={[styles.button, anyUploading ? styles.buttonDisabled : null]}
          >
            <Text style={styles.buttonText}>{Strings.registerSubmit}</Text>
          </Pressable>

          {/* Only offered once there is a registration to come back to. On the
              fallback path — a server that filed nothing at the OTP step —
              this form is still the only thing that registers anyone, and
              skipping it would leave the driver with nothing at all. */}
          {isDetailsPending ? (
            <>
              <Pressable onPress={leaveForm} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>{Strings.registerSkip}</Text>
              </Pressable>
              <Text style={styles.skipNote}>{Strings.registerSkipNote}</Text>
            </>
          ) : (
            <Pressable onPress={leaveForm} style={styles.backLink} hitSlop={6}>
              <Text style={styles.backLinkText}>{Strings.registerBackToLogin}</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAwareScrollView>

      <PhotoSourceSheet
        visible={sourceFor != null}
        label={sourceFor?.label}
        onClose={() => setSourceFor(null)}
        onPick={(source) => {
          const key = sourceFor?.key;
          setSourceFor(null);
          if (key) void useRegistrationStore.getState().pickPhoto(key, source);
        }}
      />

      {isSubmitting && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      )}
    </View>
  );
}

// ── Pieces ───────────────────────────────────────────────────

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  onBlur?: () => void;
  error?: string;
  keyboardType?: 'default' | 'number-pad';
  autoCapitalize?: 'none' | 'words' | 'characters';
  maxLength?: number;
  /** Static text inside the box, ahead of the input (the country code). */
  prefix?: string;
  /** Shows a spinner in the box while a ULIP lookup for this field runs. */
  busy?: boolean;
  /** False for a value the driver has already proved and must not change. */
  editable?: boolean;
  /** Reassurance under the box, e.g. that the number is verified. */
  note?: string;
  /** Static text inside the box, after the input (a unit). */
  suffix?: string;
  /** Neutral help under the box. */
  hint?: string;
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  error,
  keyboardType = 'default',
  autoCapitalize = 'none',
  maxLength,
  prefix,
  busy,
  editable = true,
  note,
  suffix,
  hint,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          !editable ? styles.inputRowLocked : null,
          error ? styles.inputRowError : null,
        ]}
      >
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, prefix ? styles.inputWithPrefix : null]}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={TextShade.c400}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          editable={editable}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
        {busy ? <ActivityIndicator size="small" color={AppColors.primary} /> : null}
        {!editable ? (
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={AppColors.success500}
          />
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && note ? <Text style={styles.note}>{note}</Text> : null}
      {!error && !note && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A round photo of the driver, with the same upload states as a document tile. */
function ProfilePhotoPicker({
  slot,
  onPress,
  onRemove,
}: {
  slot: PhotoSlot;
  onPress: () => void;
  onRemove: () => void;
}) {
  const failed = slot.status === 'failed';
  return (
    <Pressable onPress={onPress} style={styles.profileRow}>
      <View
        style={[
          styles.profileCircle,
          slot.status === 'done' ? styles.photoBoxDone : null,
          failed ? styles.photoBoxFailed : null,
        ]}
      >
        {slot.uri ? (
          <Image source={{ uri: slot.uri }} style={styles.profileImage} resizeMode="cover" />
        ) : (
          <Ionicons name="person-outline" size={34} color={Primary.c900} />
        )}
        {slot.status === 'uploading' ? (
          <View style={[styles.photoOverlay, styles.profileOverlay]}>
            <ActivityIndicator size="small" color={AppColors.white} />
          </View>
        ) : null}
        {failed ? (
          <View style={[styles.photoOverlay, styles.photoOverlayFailed, styles.profileOverlay]}>
            <Ionicons name="refresh" size={20} color={AppColors.white} />
          </View>
        ) : null}
      </View>
      <View style={styles.profileText}>
        <Text style={styles.photoChange}>
          {failed
            ? Strings.registerPhotoRetry
            : slot.uri
              ? Strings.registerPhotoChange
              : Strings.registerProfilePhotoAdd}
        </Text>
        {slot.status === 'done' ? (
          <Ionicons name="checkmark-circle" size={18} color={AppColors.success500} />
        ) : null}
        {slot.uri && slot.status !== 'uploading' ? (
          <Pressable onPress={onRemove} hitSlop={8} style={styles.removeLink}>
            <Ionicons name="trash-outline" size={14} color={AppColors.error600} />
            <Text style={styles.photoRemove}>{Strings.registerPhotoRemove}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

interface PhotoTileProps {
  label: string;
  slot: PhotoSlot;
  onPress: () => void;
  /** Re-pick a photo that is already there (uploaded or failed). */
  onChange: () => void;
  /** Take the photo off; the slot is empty again. */
  onRemove: () => void;
}

function PhotoTile({ label, slot, onPress, onChange, onRemove }: PhotoTileProps) {
  const failed = slot.status === 'failed';
  return (
    <View style={styles.photoTile}>
      <Pressable
        onPress={onPress}
        style={[
          styles.photoBox,
          slot.status === 'done' ? styles.photoBoxDone : null,
          failed ? styles.photoBoxFailed : null,
        ]}
      >
        {slot.uri ? (
          <Image source={{ uri: slot.uri }} style={styles.photoImage} resizeMode="cover" />
        ) : (
          <View style={styles.photoEmpty}>
            <Ionicons name="camera-outline" size={26} color={Primary.c900} />
            <Text style={styles.photoEmptyText}>{Strings.registerPhotoAdd}</Text>
          </View>
        )}

        {slot.status === 'uploading' ? (
          <View style={styles.photoOverlay}>
            <ActivityIndicator size="small" color={AppColors.white} />
            <Text style={styles.photoOverlayText}>{Strings.registerPhotoUploading}</Text>
          </View>
        ) : null}
        {failed ? (
          <View style={[styles.photoOverlay, styles.photoOverlayFailed]}>
            <Ionicons name="refresh" size={20} color={AppColors.white} />
            <Text style={styles.photoOverlayText}>{Strings.registerPhotoRetry}</Text>
          </View>
        ) : null}
        {slot.status === 'done' ? (
          <View style={styles.photoTick}>
            <Ionicons name="checkmark-circle" size={22} color={AppColors.success500} />
          </View>
        ) : null}
        {/* Remove, on the photo itself: the quickest way to take a wrong one off. */}
        {slot.uri && slot.status !== 'uploading' ? (
          <Pressable onPress={onRemove} hitSlop={8} style={styles.photoRemoveButton}>
            <Ionicons name="close" size={16} color={AppColors.white} />
          </Pressable>
        ) : null}
      </Pressable>

      <View style={styles.photoFoot}>
        <Text style={styles.photoLabel} numberOfLines={1}>
          {label}
        </Text>
        {slot.uri && slot.status !== 'uploading' ? (
          <View style={styles.photoActions}>
            <Pressable onPress={onChange} hitSlop={8}>
              <Text style={styles.photoChange}>{Strings.registerPhotoChange}</Text>
            </Pressable>
            <Pressable onPress={onRemove} hitSlop={8}>
              <Text style={styles.photoRemove}>{Strings.registerPhotoRemove}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

interface LookupPanelProps {
  title: string;
  state: 'idle' | 'loading' | 'done' | 'failed';
  /** [label, value] pairs; entries with no value are dropped. */
  rows: [string, string | undefined][];
  /** Runs the lookup again — the way out of a failure, since submit needs it. */
  onRetry: () => void;
}

/**
 * Renders nothing until a lookup has been attempted, so the form is not
 * littered with empty boxes for fields the driver has not filled in yet.
 */
function LookupPanel({ title, state, rows, onRetry }: LookupPanelProps) {
  if (state === 'idle') return null;

  const filled = rows.filter(([, v]) => v != null && v !== '');

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>

      {state === 'loading' ? (
        <View style={styles.panelRowCenter}>
          <ActivityIndicator size="small" color={AppColors.primary} />
          <Text style={styles.panelMuted}>{Strings.registerVerifying}</Text>
        </View>
      ) : null}

      {state === 'failed' ? (
        <>
          <Text style={styles.panelFailed}>{Strings.registerVerifyFailed}</Text>
          <Pressable onPress={onRetry} style={styles.panelRetry} hitSlop={6}>
            <Text style={styles.panelRetryText}>{Strings.registerRetryLookup}</Text>
          </Pressable>
        </>
      ) : null}

      {state === 'done'
        ? filled.map(([label, value]) => (
            <View key={label} style={styles.panelRow}>
              <Text style={styles.panelLabel}>{label}</Text>
              {/* A full maker/model string is long; cap it rather than let it
                  push the row taller than the rest of the panel. */}
              <Text style={styles.panelValue} numberOfLines={2}>
                {value}
              </Text>
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  scroll: { flexGrow: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  back: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 8 },
  title: { ...Typography.h3.bold, color: AppColors.text, marginTop: 8 },
  subtitle: { ...Typography.body2.regular, color: TextShade.c700, marginTop: 6 },
  form: { paddingHorizontal: 16, paddingTop: 8 },

  rejectedBanner: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEF3F2',
  },
  rejectedTitle: { ...Typography.body2.bold, color: AppColors.error600 },
  rejectedReason: {
    ...Typography.body2.regular,
    color: AppColors.text,
    marginTop: 6,
  },

  field: { marginTop: 16 },
  label: { ...Typography.body2.bold, color: AppColors.text, marginBottom: 6 },
  inputRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: TextShade.c200,
  },
  inputRowError: { borderColor: AppColors.error500 },
  /** A verified, uneditable value — flat fill so it reads as settled, not disabled. */
  inputRowLocked: { backgroundColor: AppColors.secondary100, borderColor: TextShade.c100 },
  note: { ...Typography.caption.regular, color: AppColors.success500, marginTop: 6 },
  prefix: { ...Typography.body1.medium, color: AppColors.text },
  suffix: { ...Typography.body2.bold, color: TextShade.c600, marginLeft: 8 },
  hint: { ...Typography.caption.regular, color: TextShade.c700, marginTop: 6 },
  labelMuted: { ...Typography.body2.regular, color: TextShade.c600 },
  optionalHead: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: TextShade.c100,
  },
  optionalTitle: { ...Typography.body1.bold, color: AppColors.text },
  optionalNote: { ...Typography.caption.regular, color: TextShade.c700, marginTop: 4 },
  input: {
    flex: 1,
    padding: 0,
    ...Typography.body1.medium,
    color: AppColors.text,
  },
  inputWithPrefix: { marginLeft: 7 },
  error: { ...Typography.caption.regular, color: AppColors.error600, marginTop: 6 },

  panel: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: AppColors.secondary100,
  },
  panelTitle: { ...Typography.caption.extraBold, color: AppColors.primary },
  panelRow: { flexDirection: 'row', marginTop: 8 },
  panelRowCenter: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  panelLabel: { ...Typography.body2.regular, color: TextShade.c700, width: 110 },
  panelValue: { ...Typography.body2.bold, color: AppColors.text, flex: 1 },
  panelMuted: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    marginTop: 8,
    marginLeft: 8,
  },
  /** Not an error any more — the photos carry the submit — so muted, not red. */
  panelFailed: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    marginTop: 8,
  },
  panelRetry: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4 },
  panelRetryText: { ...Typography.caption.extraBold, color: AppColors.primary },

  submitError: {
    ...Typography.body2.regular,
    color: AppColors.error600,
    marginTop: 14,
  },
  button: {
    marginTop: 20,
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { ...Typography.button2.extraBold, color: AppColors.white },

  photosNote: { ...Typography.caption.regular, color: TextShade.c700, marginBottom: 10 },
  photosHint: { ...Typography.caption.regular, color: TextShade.c700 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  photoTile: { width: '48%', marginBottom: 12 },
  photoBox: {
    height: 110,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Primary.c300,
    backgroundColor: AppColors.secondary100,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBoxDone: { borderStyle: 'solid', borderColor: AppColors.success500 },
  photoBoxFailed: { borderStyle: 'solid', borderColor: AppColors.error500 },
  photoImage: { width: '100%', height: '100%' },
  photoEmpty: { alignItems: 'center' },
  photoEmptyText: { ...Typography.caption.extraBold, color: Primary.c900, marginTop: 4 },
  photoOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  photoOverlayFailed: { backgroundColor: 'rgba(180,35,24,0.7)' },
  photoOverlayText: {
    ...Typography.caption.extraBold,
    color: AppColors.white,
    marginTop: 4,
    textAlign: 'center',
  },
  photoTick: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: AppColors.white,
    borderRadius: 11,
  },
  photoFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  profileCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImage: { width: '100%', height: '100%' },
  profileOverlay: { borderRadius: 42 },
  profileText: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 14 },
  photoLabel: { ...Typography.caption.regular, color: AppColors.text, flex: 1 },
  photoChange: { ...Typography.caption.extraBold, color: AppColors.primary },
  photoRemove: { ...Typography.caption.extraBold, color: AppColors.error600 },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  removeLink: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 10 },
  photoRemoveButton: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLink: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  backLinkText: { ...Typography.button2.extraBold, color: Primary.c900 },

  /** Outlined, not filled: submitting is the thing to do, this is the way past it. */
  skipButton: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
    padding: 15,
    alignItems: 'center',
  },
  skipButtonText: { ...Typography.button2.extraBold, color: Primary.c900 },
  skipNote: {
    ...Typography.caption.regular,
    color: TextShade.c600,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 18,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
