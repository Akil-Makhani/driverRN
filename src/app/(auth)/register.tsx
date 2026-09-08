/**
 * Driver self-registration — the screen a driver reaches from login when they
 * do not have an account yet. Submits to the public POST /driver/registration,
 * which files a 'Pending' record for an admin to approve or reject.
 *
 * The two detail panels are the point of the ULIP lookups: rather than making
 * the driver trust that they typed their vehicle and licence numbers
 * correctly, the form shows back whose vehicle and whose licence it matched
 * before they submit. A lookup that fails is not an error — the backend files
 * the request either way — so the panel says so and the button stays enabled.
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

import { RegistrationStatusDialog } from '@/components/registration-status-dialog';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { digitsOnly, groupDigits } from '@/core/utils/number-format';
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
  const outcome = useRegistrationStore((s) => s.outcome);

  const set = (key: FieldKey) => (value: string) =>
    useRegistrationStore.getState().setField(key, value);

  const goToLogin = () => {
    useRegistrationStore.getState().dismissOutcome();
    useRegistrationStore.getState().reset();
    router.replace('/(auth)/login');
  };

  const onSubmit = async () => {
    Keyboard.dismiss();
    await useRegistrationStore.getState().submit();
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
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={AppColors.text} />
          </Pressable>
          <Text style={styles.title}>{Strings.registerTitle}</Text>
          <Text style={styles.subtitle}>{Strings.registerSubtitle}</Text>
        </View>

        <View style={styles.form}>
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
          />

          {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={isSubmitting}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{Strings.registerSubmit}</Text>
          </Pressable>

          <Pressable onPress={goToLogin} style={styles.backLink} hitSlop={6}>
            <Text style={styles.backLinkText}>{Strings.registerBackToLogin}</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>

      {isSubmitting && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      )}

      <RegistrationStatusDialog
        outcome={outcome}
        // Nothing else to do on this screen once the request is in, so the
        // popup closing is also the cue to hand the driver back to login.
        onDismiss={outcome?.kind === 'rejected' ? () => useRegistrationStore.getState().dismissOutcome() : goToLogin}
        onGoToLogin={goToLogin}
        onEdit={() => useRegistrationStore.getState().dismissOutcome()}
      />
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
}

/**
 * Renders nothing until a lookup has been attempted, so the form is not
 * littered with empty boxes for fields the driver has not filled in yet.
 */
function LookupPanel({ title, state, rows }: LookupPanelProps) {
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
        <Text style={styles.panelMuted}>{Strings.registerVerifyFailed}</Text>
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

  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
