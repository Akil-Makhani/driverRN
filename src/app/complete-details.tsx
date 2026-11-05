/**
 * "Complete your details" (Tiles Drop): the name, licence number, date of
 * birth and four document photos a driver may leave out at registration,
 * which only asks for the vehicle number and tempo capacity.
 *
 * The admin's trip limit (Tempo App Setting) decides when these become
 * compulsory: past it with anything missing, the driver gets no new trips.
 * The dashboard's banner and its blocking sheet both lead here.
 *
 * Each photo uploads and is saved to the account as soon as it is picked, so
 * it is never lost. The typed fields are kept on the phone as they are typed
 * (a draft), so a driver who leaves the app comes back to what they entered;
 * SAVE files them. Blank fields are not sent, so saving a half-filled form
 * never clears a detail already on file. Once everything is in, the driver is
 * taken straight to the dashboard.
 */
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/app-bar';
import { PhotoSourceSheet, type PhotoSourceChoice } from '@/components/photo-source-sheet';
import { AppException } from '@/core/api/errors';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { localDigits } from '@/core/i18n/language';
import { resetTo } from '@/core/navigation';
import { useSession } from '@/core/session';
import { Preference } from '@/core/storage/preference';
import { DriverDetailsRepository } from '@/core/services/driver-details-repository';
import { dobFromIso, dobToIso } from '@/core/utils/dob';
import { useAuthStore } from '@/features/auth/auth-store';
import {
  formatDobInput,
  formatLicenceInput,
  validateOptionalDetails,
} from '@/features/auth/registration-store';
import type { DriverDetails, DriverDetailsStatus } from '@/types/driver-details';
import { REGISTRATION_DOCUMENT_KEYS, type RegistrationDocumentKey } from '@/types/registration';

type TextKey = 'driverName' | 'driverLicenceNumber' | 'dob';

interface Slot {
  /** What is on screen: a local pick, or the link to the photo on file. */
  uri?: string;
  mimeType?: string;
  /** The S3 key, once uploaded (or as on file). */
  fileKey?: string;
  /** True for a photo uploaded on this screen and not saved yet. */
  isNew?: boolean;
  status: 'idle' | 'uploading' | 'done' | 'failed';
}

const EMPTY_SLOTS = (): Record<RegistrationDocumentKey, Slot> => ({
  dlFront: { status: 'idle' },
  dlBack: { status: 'idle' },
  rcFront: { status: 'idle' },
  rcBack: { status: 'idle' },
});

/** Read at render time, never at module load — see core/constants/strings. */
const photoLabels = (): [RegistrationDocumentKey, string][] => [
  ['dlFront', Strings.registerPhotoDlFront],
  ['dlBack', Strings.registerPhotoDlBack],
  ['rcFront', Strings.registerPhotoRcFront],
  ['rcBack', Strings.registerPhotoRcBack],
];

export default function CompleteDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  /** Where this driver's unsaved typing is kept on the phone. */
  const draftKey = `details.${useSession((st) => st.user?.id) ?? 'driver'}`;
  /** False until the first load, so the empty initial form is not saved as a draft. */
  const [ready, setReady] = useState(false);

  const [details, setDetails] = useState<DriverDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState<Record<TextKey, string>>({
    driverName: '',
    driverLicenceNumber: '',
    dob: '',
  });
  const [errors, setErrors] = useState<Partial<Record<TextKey, string>>>({});
  const [slots, setSlots] = useState(EMPTY_SLOTS);
  const [sourceFor, setSourceFor] = useState<{ key: RegistrationDocumentKey; label: string } | null>(null);

  /** Fills the form from what is on file. */
  const apply = useCallback((d: DriverDetails) => {
    setDetails(d);
    setForm({ driverName: d.driverName, driverLicenceNumber: d.driverLicenceNumber, dob: dobFromIso(d.dob) });
    const next = EMPTY_SLOTS();
    for (const key of REGISTRATION_DOCUMENT_KEYS) {
      const photo = d.documents[key];
      if (photo) next[key] = { uri: photo.url, fileKey: photo.fileKey, status: 'done' };
    }
    setSlots(next);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const d = await DriverDetailsRepository.get();
      if (d) {
        apply(d);
        // What the driver typed last time and did not save wins over what is
        // on file: it is the newer of the two.
        const draft = Preference.getDraft<Partial<Record<TextKey, string>>>(draftKey);
        if (draft) {
          setForm((f) => ({
            driverName: draft.driverName?.trim() ? draft.driverName : f.driverName,
            driverLicenceNumber: draft.driverLicenceNumber?.trim()
              ? draft.driverLicenceNumber
              : f.driverLicenceNumber,
            dob: draft.dob?.trim() ? draft.dob : f.dob,
          }));
        }
        setReady(true);
      } else setLoadFailed(true);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [apply, draftKey]);

  useEffect(() => {
    void load();
  }, [load]);

  // Every keystroke is kept on the phone until it is saved.
  useEffect(() => {
    if (ready) Preference.saveDraft(draftKey, form);
  }, [ready, draftKey, form]);

  /** Everything is in: no draft left to keep, and back to the dashboard. */
  const finish = useCallback(() => {
    Preference.clearDraft(draftKey);
    void useAuthStore.getState().loadProfile();
    resetTo('/dashboard');
  }, [draftKey]);

  /** True when the typed fields differ from what is on file. */
  const hasUnsavedText = (d: DriverDetails | null, f: Record<TextKey, string>) =>
    (f.driverName.trim() && f.driverName.trim() !== (d?.driverName ?? '')) ||
    (f.driverLicenceNumber.trim() && f.driverLicenceNumber.trim() !== (d?.driverLicenceNumber ?? '')) ||
    (dobToIso(f.dob) && dobToIso(f.dob) !== (d?.dob ?? ''));

  // The latest form, for the photo upload above, which finishes after renders.
  const formRef = useRef(form);
  formRef.current = form;

  const setField = (key: TextKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setMessage(null);
  };

  const upload = async (key: RegistrationDocumentKey, uri: string, mimeType: string) => {
    setSlots((s) => ({ ...s, [key]: { uri, mimeType, status: 'uploading' } }));
    try {
      const fileKey = await DriverDetailsRepository.uploadDocument(key, uri, mimeType);
      // Re-picked while this was in flight: the newer photo owns the slot.
      setSlots((s) => (s[key].uri !== uri ? s : { ...s, [key]: { uri, mimeType, fileKey, isNew: true, status: 'done' } }));
      // Saved to the account straight away, so leaving the app cannot lose it.
      // If this save fails the photo stays new, and SAVE sends it.
      try {
        const saved = await DriverDetailsRepository.save({ documents: { [key]: fileKey } });
        if (saved) {
          setDetails(saved);
          setSlots((s) => (s[key].fileKey !== fileKey ? s : { ...s, [key]: { ...s[key], isNew: false } }));
          void useAuthStore.getState().loadProfile();
          // This photo was the last thing missing, and nothing typed is unsaved.
          if (saved.status?.complete && !hasUnsavedText(saved, formRef.current)) finish();
        }
      } catch {
        // Left for SAVE.
      }
    } catch {
      setSlots((s) => (s[key].uri !== uri ? s : { ...s, [key]: { uri, mimeType, status: 'failed' } }));
    }
  };

  const pickPhoto = async (key: RegistrationDocumentKey, source: PhotoSourceChoice) => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage(Strings.registerPhotoPermission);
      return;
    }
    // A document photo only has to be legible; 0.6 keeps it small on a weak connection.
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setMessage(null);
    await upload(key, asset.uri, asset.mimeType ?? 'image/jpeg');
  };

  const onSave = async () => {
    Keyboard.dismiss();
    const found = validateOptionalDetails(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    if (REGISTRATION_DOCUMENT_KEYS.some((k) => slots[k].status === 'uploading')) return;

    // Only what changed, and never a blank.
    const changed = (key: TextKey) => {
      // The DOB is typed DD-MM-YYYY and stored YYYY-MM-DD.
      const value = key === 'dob' ? dobToIso(form.dob) : form[key].trim();
      return value && value !== (details?.[key] ?? '') ? value : undefined;
    };
    const documents: Partial<Record<RegistrationDocumentKey, string>> = {};
    for (const key of REGISTRATION_DOCUMENT_KEYS) {
      if (slots[key].isNew && slots[key].fileKey) documents[key] = slots[key].fileKey;
    }
    const update = {
      driverName: changed('driverName'),
      driverLicenceNumber: changed('driverLicenceNumber'),
      dob: changed('dob'),
      ...(Object.keys(documents).length ? { documents } : {}),
    };
    if (!update.driverName && !update.driverLicenceNumber && !update.dob && !update.documents) {
      if (details?.status?.complete) {
        finish();
        return;
      }
      setMessage(Strings.detailsNothingToSave);
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const saved = await DriverDetailsRepository.save(update);
      if (saved) apply(saved);
      // Saved, so the draft has nothing left to keep.
      Preference.clearDraft(draftKey);
      if (saved?.status?.complete) {
        // Everything is in: straight to the dashboard.
        finish();
        return;
      }
      // The dashboard banner reads the profile, so refresh it now.
      void useAuthStore.getState().loadProfile();
      setMessage(Strings.detailsSaved);
    } catch (e) {
      setMessage(e instanceof AppException && e.message ? e.message : Strings.somethingWentWrong);
    } finally {
      setSaving(false);
    }
  };

  const anyUploading = REGISTRATION_DOCUMENT_KEYS.some((k) => slots[k].status === 'uploading');

  return (
    <View style={styles.screen}>
      <AppBar title={Strings.detailsTitle} leading="back" onLeadingPress={() => router.back()} />

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && details != null}
            onRefresh={() => void load()}
            colors={[AppColors.primary]}
            tintColor={AppColors.primary}
          />
        }
      >
        {loading && !details ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={AppColors.primary} />
          </View>
        ) : loadFailed && !details ? (
          <View style={styles.center}>
            <Text style={styles.muted}>{Strings.detailsLoadFailed}</Text>
            <Pressable onPress={() => void load()} style={styles.retry} hitSlop={6}>
              <Text style={styles.retryText}>{Strings.registerRetryLookup}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>{Strings.detailsSubtitle}</Text>

            <StatusCard status={details?.status ?? null} />

            {/* What registration already has: shown, not edited here. */}
            <View style={styles.vehicleCard}>
              <View style={styles.vehicleItem}>
                <Text style={styles.vehicleLabel}>{Strings.registerVehicleNumber}</Text>
                <Text style={styles.vehicleValue}>{details?.vehicleNumber || '—'}</Text>
              </View>
              <View style={styles.vehicleDivider} />
              <View style={styles.vehicleItem}>
                <Text style={styles.vehicleLabel}>{Strings.registerCapacity}</Text>
                <Text style={styles.vehicleValue}>
                  {details?.vehicleCapacity ? localDigits(`${details.vehicleCapacity} KG`) : '—'}
                </Text>
              </View>
            </View>

            <Field
              label={Strings.registerDriverName}
              placeholder={Strings.registerDriverNameHint}
              value={form.driverName}
              onChangeText={(t) => setField('driverName', t)}
              error={errors.driverName}
              autoCapitalize="words"
              done={!!details?.driverName}
            />
            <Field
              label={Strings.registerLicenceNumber}
              placeholder={Strings.registerLicenceHint}
              value={form.driverLicenceNumber}
              onChangeText={(t) => setField('driverLicenceNumber', formatLicenceInput(t))}
              error={errors.driverLicenceNumber}
              autoCapitalize="characters"
              done={!!details?.driverLicenceNumber}
            />
            <Field
              label={Strings.registerDob}
              placeholder={Strings.registerDobHint}
              value={localDigits(form.dob)}
              onChangeText={(t) => setField('dob', formatDobInput(t))}
              error={errors.dob}
              keyboardType="number-pad"
              maxLength={10}
              done={!!details?.dob}
            />

            <View style={styles.field}>
              <Text style={styles.label}>{Strings.registerPhotosTitle}</Text>
              <View style={styles.photoGrid}>
                {photoLabels().map(([key, label]) => (
                  <PhotoTile
                    key={key}
                    label={label}
                    slot={slots[key]}
                    onPress={() => {
                      const slot = slots[key];
                      if (slot.status === 'failed' && slot.uri) {
                        void upload(key, slot.uri, slot.mimeType ?? 'image/jpeg');
                      } else if (slot.status !== 'uploading') {
                        Keyboard.dismiss();
                        setSourceFor({ key, label });
                      }
                    }}
                  />
                ))}
              </View>
            </View>

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <Pressable
              onPress={() => void onSave()}
              disabled={saving || anyUploading}
              style={[styles.button, saving || anyUploading ? styles.buttonDisabled : null]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={AppColors.white} />
              ) : (
                <Text style={styles.buttonText}>{Strings.detailsSave}</Text>
              )}
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollView>

      <PhotoSourceSheet
        visible={sourceFor != null}
        label={sourceFor?.label}
        onClose={() => setSourceFor(null)}
        onPick={(source) => {
          const key = sourceFor?.key;
          setSourceFor(null);
          if (key) void pickPhoto(key, source);
        }}
      />
    </View>
  );
}

// ── Pieces ───────────────────────────────────────────────────

/** Where the driver stands: all done, trips left, or no new trips until done. */
function StatusCard({ status }: { status: DriverDetailsStatus | null }) {
  if (!status) return null;
  if (status.complete) {
    return (
      <View style={[styles.statusCard, styles.statusDone]}>
        <Ionicons name="checkmark-circle" size={22} color={AppColors.success500} />
        <Text style={styles.statusText}>{Strings.detailsAllDone}</Text>
      </View>
    );
  }
  const body = status.blocked
    ? Strings.detailsBlockedBody.replace('{count}', localDigits(String(status.completedTrips)))
    : status.tripsLeft != null
      ? Strings.detailsBannerTripsLeft.replace('{count}', localDigits(String(status.tripsLeft)))
      : Strings.detailsBannerNoLimit;
  return (
    <View style={[styles.statusCard, status.blocked ? styles.statusBlocked : styles.statusPending]}>
      <Ionicons
        name={status.blocked ? 'alert-circle' : 'information-circle'}
        size={22}
        color={status.blocked ? AppColors.error600 : AppColors.primary}
      />
      <View style={styles.statusBody}>
        <Text style={styles.statusTitle}>
          {Strings.detailsMissingCount.replace('{count}', localDigits(String(status.missing.length)))}
        </Text>
        <Text style={styles.statusText}>{body}</Text>
      </View>
    </View>
  );
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  keyboardType?: 'default' | 'number-pad';
  autoCapitalize?: 'none' | 'words' | 'characters';
  maxLength?: number;
  /** Already on file: a tick beside the label. */
  done?: boolean;
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  keyboardType = 'default',
  autoCapitalize = 'none',
  maxLength,
  done,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {done ? <Ionicons name="checkmark-circle" size={16} color={AppColors.success500} /> : null}
      </View>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={TextShade.c400}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function PhotoTile({ label, slot, onPress }: { label: string; slot: Slot; onPress: () => void }) {
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
      </Pressable>
      <View style={styles.photoFoot}>
        <Text style={styles.photoLabel} numberOfLines={1}>
          {label}
        </Text>
        {slot.uri && slot.status !== 'uploading' ? (
          <Text style={styles.photoChange}>{Strings.registerPhotoChange}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  content: { paddingHorizontal: 16, paddingTop: 12, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  muted: { ...Typography.body2.regular, color: TextShade.c700, textAlign: 'center' },
  retry: { marginTop: 12, paddingVertical: 6 },
  retryText: { ...Typography.caption.extraBold, color: AppColors.primary },
  subtitle: { ...Typography.body2.regular, color: TextShade.c700 },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  statusDone: { backgroundColor: '#ECFDF3', alignItems: 'center' },
  statusPending: { backgroundColor: AppColors.secondary100 },
  statusBlocked: { backgroundColor: '#FEF3F2' },
  statusBody: { flex: 1 },
  statusTitle: { ...Typography.body2.bold, color: AppColors.text },
  statusText: { ...Typography.caption.regular, color: AppColors.text, marginTop: 2, flexShrink: 1 },

  vehicleCard: {
    flexDirection: 'row',
    marginTop: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TextShade.c100,
    paddingVertical: 12,
  },
  vehicleItem: { flex: 1, paddingHorizontal: 12 },
  vehicleDivider: { width: 1, backgroundColor: TextShade.c100 },
  vehicleLabel: { ...Typography.caption.regular, color: TextShade.c700 },
  vehicleValue: { ...Typography.body1.bold, color: AppColors.text, marginTop: 2 },

  field: { marginTop: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  label: { ...Typography.body2.bold, color: AppColors.text },
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
  input: { flex: 1, padding: 0, ...Typography.body1.medium, color: AppColors.text },
  error: { ...Typography.caption.regular, color: AppColors.error600, marginTop: 6 },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
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
  photoLabel: { ...Typography.caption.regular, color: AppColors.text, flex: 1 },
  photoChange: { ...Typography.caption.extraBold, color: AppColors.primary },

  message: { ...Typography.body2.regular, color: AppColors.primary, marginTop: 12 },
  button: {
    marginTop: 18,
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { ...Typography.button2.extraBold, color: AppColors.white },
});
