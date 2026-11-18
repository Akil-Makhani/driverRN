/**
 * The photos a tempo step needs before it can go through: Confirm Load asks
 * for the loading photo, the weight slip and the company invoice; Delivered
 * for the delivery photo and the proof of delivery. One photo per slot, taken
 * with the camera or picked from the gallery, uploaded straight away.
 *
 * Lives inside the step's sheet so the driver sees, next to CONFIRM, exactly
 * which photo is still missing. Tapping a slot opens TripPhotoPicker - the
 * same look as the profile photo sheet - which the sheet renders over itself.
 */
import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import type { DocumentTypeValue } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { closePhotoViewer, openPhotoViewer } from './photo-viewer';
import { InAppGallery } from './in-app-gallery';
import {
  MAX_PHOTOS_PER_SLOT,
  type PhotoSource,
  type PickedPhoto,
  type TripAttachment,
  type UploadOutcome,
  useTripDetailStore,
} from './trip-detail-store';

export interface PhotoSlot {
  type: DocumentTypeValue;
  label: string;
}

type IconName = ComponentProps<typeof Ionicons>['name'];

/** A picture per document, so the driver can tell the slots apart at a glance. */
const SLOT_ICON: Record<DocumentTypeValue, IconName> = {
  loading_image: 'cube',
  weight_slip: 'receipt',
  invoice: 'document-text',
  delivery_image: 'home',
  proof_of_delivery: 'create',
};

/** The slot whose chooser is open, shared by the slots and the picker. */
const usePickerStore = create<{
  slot: PhotoSlot | null;
  /** The in-app gallery is open over the chooser. */
  gallery: boolean;
  open: (s: PhotoSlot | null) => void;
  showGallery: (on: boolean) => void;
}>((set) => ({
  slot: null,
  gallery: false,
  open: (slot) => set({ slot, gallery: false }),
  showGallery: (gallery) => set({ gallery }),
}));

/**
 * Android back inside a step's sheet: closes the full-screen photo, then the
 * chooser, before the sheet itself. Says whether it closed something.
 */
export function closePhotoPicker(): boolean {
  if (closePhotoViewer()) return true;
  if (useNoticeStore.getState().notice) {
    closeNotice();
    return true;
  }
  if (usePickerStore.getState().gallery) {
    usePickerStore.getState().showGallery(false);
    return true;
  }
  if (!usePickerStore.getState().slot) return false;
  usePickerStore.getState().open(null);
  return true;
}

/** True when every slot has at least one photo and none is still uploading. */
export function photosComplete(slots: PhotoSlot[]): boolean {
  const { files, uploading } = useTripDetailStore.getState();
  return uploading == null && slots.every((s) => files[s.type].length > 0);
}

/**
 * Shows the driver why CONFIRM did nothing, and returns false; true when the
 * step may go ahead.
 */
export function checkPhotos(slots: PhotoSlot[], title: string, missingMessage: string): boolean {
  if (useTripDetailStore.getState().uploading != null) {
    useNoticeStore.setState({
      notice: { kind: 'uploading', title, message: Strings.waitForPhotoUpload, slots },
    });
    return false;
  }
  if (!photosComplete(slots)) {
    useNoticeStore.setState({ notice: { kind: 'missing', title, message: missingMessage, slots } });
    return false;
  }
  return true;
}

interface PhotoNotice {
  kind: 'missing' | 'uploading';
  /** The step being refused, e.g. "Confirm Load". */
  title: string;
  message: string;
  slots: PhotoSlot[];
}

const useNoticeStore = create<{ notice: PhotoNotice | null }>(() => ({ notice: null }));

const closeNotice = () => useNoticeStore.setState({ notice: null });

/**
 * Why CONFIRM did not go through, drawn like the app's own dialogs rather
 * than a bare system alert: which photos are in and which are still missing,
 * and a button straight to the first missing one. An overlay, as it opens
 * inside the step's sheet; render it before TripPhotoPicker.
 */
export function PhotoCheckNotice() {
  const notice = useNoticeStore((s) => s.notice);
  const files = useTripDetailStore((s) => s.files);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (notice) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }).start();
    }
  }, [notice, anim]);

  // A notice left over from an earlier opening must not greet the next one.
  useEffect(() => () => closeNotice(), []);

  if (!notice) return null;
  const uploading = notice.kind === 'uploading';
  const firstMissing = notice.slots.find((s) => files[s.type].length === 0);

  return (
    <View style={[StyleSheet.absoluteFill, noticeStyles.layer]}>
      <Animated.View style={[noticeStyles.scrim, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeNotice} />
      </Animated.View>

      <Animated.View
        style={[
          noticeStyles.card,
          {
            opacity: anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
          },
        ]}
      >
        <View style={[noticeStyles.badge, uploading && noticeStyles.badgeWait]}>
          {uploading ? (
            <ActivityIndicator color={AppColors.primary} />
          ) : (
            <Ionicons name="camera" size={30} color={AppColors.error500} />
          )}
        </View>

        <Text style={noticeStyles.step}>{notice.title}</Text>
        <Text style={noticeStyles.title}>
          {uploading ? Strings.photoNoticeUploadingTitle : Strings.photoNoticeTitle}
        </Text>
        <Text style={noticeStyles.message}>{notice.message}</Text>

        <View style={noticeStyles.list}>
          {notice.slots.map((slot) => {
            const count = files[slot.type].length;
            const done = count > 0;
            return (
              <View key={slot.type} style={[noticeStyles.row, done ? noticeStyles.rowDone : noticeStyles.rowMissing]}>
                <View style={[noticeStyles.rowIcon, done ? noticeStyles.rowIconDone : noticeStyles.rowIconMissing]}>
                  <Ionicons name={SLOT_ICON[slot.type]} size={16} color={done ? AppColors.success500 : AppColors.error500} />
                </View>
                <Text style={noticeStyles.rowLabel} numberOfLines={1}>
                  {slot.label}
                </Text>
                <View style={noticeStyles.rowState}>
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={done ? AppColors.success500 : AppColors.error500}
                  />
                  <Text style={[noticeStyles.rowStateText, { color: done ? AppColors.success500 : AppColors.error500 }]}>
                    {done ? `${count} ${Strings.tripPhotosWord}` : Strings.photoNoticeMissing}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {!uploading && firstMissing ? (
          <>
            <Pressable
              style={noticeStyles.primary}
              onPress={() => {
                closeNotice();
                usePickerStore.getState().open(firstMissing);
              }}
            >
              <Ionicons name="camera-outline" size={18} color={AppColors.white} />
              <Text style={noticeStyles.primaryText}>
                {Strings.photoNoticeAddNow} · {firstMissing.label}
              </Text>
            </Pressable>
            <Pressable style={noticeStyles.secondary} onPress={closeNotice}>
              <Text style={noticeStyles.secondaryText}>{Strings.photoNoticeOk}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={noticeStyles.primary} onPress={closeNotice}>
            <Text style={noticeStyles.primaryText}>{Strings.photoNoticeOk}</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

/** The slot cards: a big tap target per document, with its state in plain sight. */
export function TripPhotoSlots({ slots }: { slots: PhotoSlot[] }) {
  const files = useTripDetailStore((s) => s.files);
  const uploading = useTripDetailStore((s) => s.uploading);
  const done = slots.filter((s) => files[s.type].length > 0).length;
  const allDone = done === slots.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.tripPhotosTitle}</Text>
        <View style={[styles.counter, allDone && styles.counterDone]}>
          <Text style={[styles.counterText, allDone && styles.counterTextDone]}>
            {done}/{slots.length}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {slots.map((slot) => {
          const list = files[slot.type];
          const first = list[0];
          const busy = uploading === slot.type;
          return (
            <Pressable
              key={slot.type}
              onPress={() => usePickerStore.getState().open(slot)}
              style={({ pressed }) => [
                styles.tile,
                first ? styles.tileDone : null,
                pressed ? styles.tilePressed : null,
              ]}
              android_ripple={{ color: Primary.c100 }}
            >
              <View style={styles.thumb}>
                {first ? (
                  <>
                    <Image source={{ uri: first.uri }} style={styles.thumbImage} />
                    {list.length > 1 ? (
                      <View style={styles.more}>
                        <Text style={styles.moreText}>+{list.length - 1}</Text>
                      </View>
                    ) : null}
                    <View style={styles.tick}>
                      {busy ? (
                        <ActivityIndicator size={10} color={AppColors.white} />
                      ) : (
                        <Ionicons name="checkmark" size={14} color={AppColors.white} />
                      )}
                    </View>
                  </>
                ) : busy ? (
                  <ActivityIndicator color={AppColors.primary} />
                ) : (
                  <>
                    <Ionicons name={SLOT_ICON[slot.type]} size={26} color={AppColors.primary} />
                    <View style={styles.plus}>
                      <Ionicons name="add" size={14} color={AppColors.white} />
                    </View>
                  </>
                )}
              </View>
              <Text style={styles.tileLabel} numberOfLines={2}>
                {slot.label}
                {!first ? <Text style={styles.required}> *</Text> : null}
              </Text>
              <Text style={[styles.tileState, first ? styles.tileStateDone : null]} numberOfLines={1}>
                {busy
                  ? Strings.photoUploading
                  : first
                    ? `${list.length} ${Strings.tripPhotosWord}`
                    : Strings.addPhoto}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {done > 0 ? <Text style={styles.footHint}>{Strings.tripPhotoTapToChange}</Text> : null}
    </View>
  );
}

/**
 * One slot's photos and how to add more, styled like the profile photo sheet:
 * a strip of what is there (tap to see it full screen, x to remove), then
 * camera / gallery. The gallery takes several photos at once. Stays open while
 * photos upload, so the driver watches them arrive.
 *
 * An overlay rather than a Modal: it opens from inside the step's sheet, which
 * is already a Modal, and a Modal on a Modal is unreliable on Android. Render
 * it, then <PhotoViewer />, as the last children of the sheet's root.
 */
export function TripPhotoPicker({ tripId }: { tripId: string }) {
  const insets = useSafeAreaInsets();
  const slot = usePickerStore((s) => s.slot);
  const galleryOpen = usePickerStore((s) => s.gallery);
  // The slot stays drawn while the sheet slides away.
  const shown = useRef<PhotoSlot | null>(null);
  if (slot) shown.current = slot;
  const type = shown.current?.type;
  const list = useTripDetailStore((s) => (type ? s.files[type] : EMPTY));
  const uploading = useTripDetailStore((s) => s.uploading);
  /** The photo waiting on "remove this photo?". */
  const [removing, setRemoving] = useState<TripAttachment | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (slot) {
      setRemoving(null);
      setMounted(true);
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
        setMounted(false),
      );
    }
  }, [slot, anim]);

  // Closing the step's sheet must not leave the chooser open for next time.
  useEffect(() => () => usePickerStore.getState().open(null), []);

  if (!mounted || !shown.current) return null;
  const current = shown.current;
  const busy = uploading === current.type;
  const full = list.length >= MAX_PHOTOS_PER_SLOT;
  const close = () => usePickerStore.getState().open(null);

  const report = (outcome: UploadOutcome) => {
    if (outcome === 'permission') Alert.alert(current.label, Strings.tripPhotoPermission);
    if (outcome === 'failed') Alert.alert(current.label, Strings.tripPhotoUploadFailed);
    if (outcome === 'full') Alert.alert(current.label, Strings.tripPhotoLimit);
  };

  const pick = async (source: PhotoSource) => {
    if (uploading != null) return;
    // The gallery is our own sheet, so a tap outside it closes it; the
    // system picker it replaces could only be closed with back.
    if (source === 'library') {
      usePickerStore.getState().showGallery(true);
      return;
    }
    report(await useTripDetailStore.getState().pickAndUpload(tripId, current.type, source));
  };

  const uploadFromGallery = async (photos: PickedPhoto[]) => {
    usePickerStore.getState().showGallery(false);
    report(await useTripDetailStore.getState().uploadPicked(tripId, current.type, photos));
  };

  const remove = (photo: TripAttachment) => {
    setRemoving(null);
    void useTripDetailStore.getState().removeAttachment(current.type, photo.key);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[pickerStyles.scrim, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>
      <Animated.View
        style={[
          pickerStyles.sheet,
          { paddingBottom: insets.bottom + 16 },
          {
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) },
            ],
          },
        ]}
      >
        <View style={pickerStyles.handle} />

        <View style={pickerStyles.header}>
          <View style={pickerStyles.headerIcon}>
            <Ionicons name={SLOT_ICON[current.type]} size={24} color={AppColors.primary} />
          </View>
          <View style={pickerStyles.headerText}>
            <Text style={pickerStyles.title}>{current.label}</Text>
            <Text style={pickerStyles.subtitle}>
              {list.length > 0
                ? `${list.length} ${Strings.tripPhotosWord} · ${Strings.tripPhotoTapToView}`
                : Strings.tripPhotoSheetHint}
            </Text>
          </View>
        </View>

        {list.length > 0 || busy ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={pickerStyles.strip}
          >
            {list.map((photo, i) => (
              <View key={photo.key} style={pickerStyles.stripItem}>
                <Pressable onPress={() => openPhotoViewer(current.label, list, i)}>
                  <Image source={{ uri: photo.uri }} style={pickerStyles.stripImage} />
                  <View style={pickerStyles.stripIndex}>
                    <Text style={pickerStyles.stripIndexText}>{i + 1}</Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => setRemoving(photo)}
                  style={pickerStyles.stripRemove}
                  hitSlop={8}
                  accessibilityLabel={Strings.profilePhotoRemove}
                >
                  <Ionicons name="close" size={14} color={AppColors.white} />
                </Pressable>
              </View>
            ))}
            {busy ? (
              <View style={[pickerStyles.stripImage, pickerStyles.stripLoading]}>
                <ActivityIndicator color={AppColors.primary} />
              </View>
            ) : null}
          </ScrollView>
        ) : null}

        {removing ? (
          <View style={pickerStyles.confirm}>
            <Image source={{ uri: removing.uri }} style={pickerStyles.confirmPhoto} />
            <Text style={pickerStyles.confirmTitle}>{Strings.tripPhotoRemoveThis}</Text>
            <View style={pickerStyles.confirmButtons}>
              <Pressable
                onPress={() => setRemoving(null)}
                style={[pickerStyles.confirmButton, pickerStyles.keepButton]}
              >
                <Text style={pickerStyles.keepText}>{Strings.registerPhotoCancel}</Text>
              </Pressable>
              <Pressable
                onPress={() => remove(removing)}
                style={[pickerStyles.confirmButton, pickerStyles.removeButton]}
              >
                <Text style={pickerStyles.removeText}>{Strings.profilePhotoRemoveYes}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {full ? (
              <Text style={pickerStyles.limit}>{Strings.tripPhotoLimit}</Text>
            ) : (
              <>
                <Option
                  icon="camera"
                  tint="#1570EF"
                  bg="#D1E9FF"
                  title={Strings.registerPhotoCamera}
                  hint={Strings.tripPhotoCameraHint}
                  disabled={uploading != null}
                  onPress={() => void pick('camera')}
                />
                <Option
                  icon="images"
                  tint="#7A5AF8"
                  bg="#EBE9FE"
                  title={Strings.registerPhotoGallery}
                  hint={Strings.tripPhotoGalleryHint}
                  disabled={uploading != null}
                  onPress={() => void pick('library')}
                />
              </>
            )}

            <Pressable
              onPress={close}
              style={[pickerStyles.cancel, list.length > 0 && pickerStyles.doneButton]}
            >
              <Text style={[pickerStyles.cancelText, list.length > 0 && pickerStyles.doneText]}>
                {list.length > 0 ? Strings.tripPhotoDone : Strings.registerPhotoCancel}
              </Text>
            </Pressable>
          </>
        )}
      </Animated.View>

      {/* Last, so it sits over the chooser. */}
      <InAppGallery
        visible={galleryOpen}
        title={current.label}
        limit={Math.max(0, MAX_PHOTOS_PER_SLOT - list.length)}
        onClose={() => usePickerStore.getState().showGallery(false)}
        onPicked={(photos) => void uploadFromGallery(photos)}
      />
    </View>
  );
}

const EMPTY: TripAttachment[] = [];

function Option({
  icon,
  tint,
  bg,
  title,
  hint,
  danger,
  disabled,
  onPress,
}: {
  icon: IconName;
  tint: string;
  bg: string;
  title: string;
  hint: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        pickerStyles.option,
        pressed ? pickerStyles.optionPressed : null,
        disabled ? pickerStyles.optionDisabled : null,
      ]}
      android_ripple={{ color: Primary.c100 }}
    >
      <View style={[pickerStyles.optionIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={pickerStyles.optionText}>
        <Text style={[pickerStyles.optionTitle, danger ? { color: AppColors.error500 } : null]}>
          {title}
        </Text>
        <Text style={pickerStyles.optionHint}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={TextShade.c500} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: AppColors.white,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { ...Typography.body1.extraBold, color: AppColors.text, flex: 1 },
  counter: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#FEE4E2',
  },
  counterDone: { backgroundColor: AppColors.success50 },
  counterText: { ...Typography.body2.extraBold, color: AppColors.error500 },
  counterTextDone: { color: AppColors.success500 },
  grid: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
    overflow: 'hidden',
  },
  tileDone: {
    borderStyle: 'solid',
    borderColor: AppColors.success300,
    backgroundColor: AppColors.success50,
  },
  tilePressed: { opacity: 0.8 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.white,
  },
  thumbImage: { width: 64, height: 64, borderRadius: 12 },
  more: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 2,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
  },
  moreText: { ...Typography.caption.regular, color: AppColors.white },
  plus: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    borderWidth: 2,
    borderColor: AppColors.white,
  },
  tick: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.success500,
    borderWidth: 2,
    borderColor: AppColors.white,
  },
  tileLabel: {
    ...Typography.body2.extraBold,
    color: AppColors.text,
    textAlign: 'center',
    marginTop: 8,
    minHeight: 34,
  },
  required: { color: AppColors.error500 },
  tileState: { ...Typography.caption.regular, color: AppColors.primary, marginTop: 2 },
  tileStateDone: { color: AppColors.success500 },
  footHint: {
    ...Typography.caption.regular,
    color: TextShade.c700,
    textAlign: 'center',
    marginTop: 8,
  },
});

/** Same look as the profile photo sheet (features/profile/photo-options-sheet). */
const pickerStyles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Primary.c300,
    marginTop: 10,
    marginBottom: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Primary.c200,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Primary.c100,
  },
  headerText: { flex: 1, marginLeft: 12 },
  title: { ...Typography.subtitle1.extraBold, color: AppColors.text },
  subtitle: { ...Typography.body2.medium, color: TextShade.c700, marginTop: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Primary.c200,
    backgroundColor: AppColors.white,
    overflow: 'hidden',
  },
  optionPressed: { backgroundColor: Primary.c100 },
  optionDisabled: { opacity: 0.5 },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1, marginLeft: 12 },
  optionTitle: { ...Typography.body1.extraBold, color: AppColors.text },
  optionHint: { ...Typography.body2.regular, color: TextShade.c700, marginTop: 1 },
  cancel: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Primary.c100,
    alignItems: 'center',
  },
  cancelText: { ...Typography.button2.extraBold, color: AppColors.primary },
  doneButton: { backgroundColor: AppColors.primary },
  doneText: { color: AppColors.white },
  strip: { gap: 10, paddingVertical: 4, paddingRight: 8 },
  stripItem: { paddingTop: 6, paddingRight: 6 },
  stripImage: { width: 76, height: 76, borderRadius: 12, backgroundColor: TextShade.c100 },
  stripLoading: { marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  stripIndex: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    minWidth: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
  },
  stripIndexText: { ...Typography.caption.regular, color: AppColors.white },
  stripRemove: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.error500,
    borderWidth: 2,
    borderColor: AppColors.white,
  },
  limit: {
    ...Typography.body2.medium,
    color: TextShade.c700,
    textAlign: 'center',
    marginTop: 12,
  },
  confirmPhoto: { width: 88, height: 88, borderRadius: 14 },
  confirm: { alignItems: 'center', paddingTop: 8 },
  confirmTitle: {
    ...Typography.subtitle1.extraBold,
    color: AppColors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  confirmBody: {
    ...Typography.body2.medium,
    color: TextShade.c700,
    marginTop: 4,
    textAlign: 'center',
  },
  confirmButtons: { flexDirection: 'row', gap: 12, marginTop: 20, alignSelf: 'stretch' },
  confirmButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  keepButton: { backgroundColor: Primary.c100 },
  keepText: { ...Typography.button2.extraBold, color: AppColors.primary },
  removeButton: { backgroundColor: AppColors.error500 },
  removeText: { ...Typography.button2.extraBold, color: AppColors.white },
});

const noticeStyles = StyleSheet.create({
  layer: { zIndex: 12, elevation: 12, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    borderRadius: 24,
    backgroundColor: AppColors.white,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE4E2',
    borderWidth: 6,
    borderColor: '#FEF3F2',
  },
  badgeWait: { backgroundColor: Primary.c100, borderColor: AppColors.white },
  step: {
    ...Typography.caption.regular,
    color: TextShade.c700,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { ...Typography.h4.extraBold, color: AppColors.text, marginTop: 2, textAlign: 'center' },
  message: {
    ...Typography.body2.medium,
    color: TextShade.c700,
    marginTop: 6,
    textAlign: 'center',
  },
  list: { alignSelf: 'stretch', gap: 8, marginTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowDone: { borderColor: AppColors.success300, backgroundColor: AppColors.success50 },
  rowMissing: { borderColor: '#FECDCA', backgroundColor: '#FEF3F2' },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDone: { backgroundColor: AppColors.white },
  rowIconMissing: { backgroundColor: AppColors.white },
  rowLabel: { ...Typography.body2.extraBold, color: AppColors.text, flex: 1, marginLeft: 10 },
  rowState: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowStateText: { ...Typography.caption.regular, fontWeight: '700' },
  primary: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: AppColors.primary,
  },
  primaryText: { ...Typography.button2.extraBold, color: AppColors.white },
  secondary: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Primary.c100,
  },
  secondaryText: { ...Typography.button2.extraBold, color: AppColors.primary },
});
