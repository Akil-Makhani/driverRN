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
 * The two detail panels are the point of the ULIP lookups: rather than making
 * the driver trust that they typed their vehicle and licence numbers
 * correctly, the form shows back whose vehicle and whose licence it matched
 * before they submit. Both have to match: submitting runs whichever lookup has
 * not succeeded and refuses until both have, so a number ULIP cannot find is
 * corrected here, by the driver holding the papers, rather than reaching an
 * admin who has nothing to check it against. A failed panel therefore offers
 * TRY AGAIN — it is a step to repeat, not a notice to read past.
 */
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
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

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { groupDigits } from '@/core/utils/number-format';
import { useAuthStore } from '@/features/auth/auth-store';
import {
  type FieldKey,
  formatDobInput,
  formatLicenceInput,
  formatVehicleInput,
  useRegistrationStore,
} from '@/features/auth/registration-store';

const MOBILE_LENGTH = 10;

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const form = useRegistrationStore((s) => s.form);
  const errors = useRegistrationStore((s) => s.errors);
  const isSubmitting = useRegistrationStore((s) => s.isSubmitting);
  const submitError = useRegistrationStore((s) => s.submitError);
  const vehicleInfo = useRegistrationStore((s) => s.vehicleInfo);
  const vehicleLookup = useRegistrationStore((s) => s.vehicleLookup);
  const licenceInfo = useRegistrationStore((s) => s.licenceInfo);
  const licenceLookup = useRegistrationStore((s) => s.licenceLookup);
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
    router.replace('/(auth)/login');
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

          <Field
            label={Strings.registerDriverName}
            placeholder={Strings.registerDriverNameHint}
            value={form.driverName}
            onChangeText={set('driverName')}
            error={errors.driverName}
            autoCapitalize="words"
          />

          {/* Locked: this is the number the OTP was just sent to and verified,
              so letting it be edited here would undo the verification. */}
          <Field
            label={Strings.registerMobile}
            placeholder="12345 67890"
            value={groupDigits(form.mobileNo)}
            onChangeText={() => {}}
            error={errors.mobileNo}
            keyboardType="number-pad"
            maxLength={11} // 10 digits + the group separator
            prefix={`+ ${Strings.commonCountryCode}`}
            editable={false}
            note={Strings.registerMobileVerified}
          />

          <Field
            label={Strings.registerVehicleNumber}
            placeholder={Strings.registerVehicleHint}
            value={form.vehicleNumber}
            onChangeText={(t) => set('vehicleNumber')(formatVehicleInput(t))}
            onBlur={() => void useRegistrationStore.getState().lookupVehicle()}
            error={errors.vehicleNumber}
            autoCapitalize="characters"
            busy={vehicleLookup === 'loading'}
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
            value={form.dob}
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

          {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={isSubmitting}
            style={styles.button}
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
  /** A failure blocks the submit, so it is coloured like the blocker it is. */
  panelFailed: {
    ...Typography.body2.regular,
    color: AppColors.error600,
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
  buttonText: { ...Typography.button2.extraBold, color: AppColors.white },
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
