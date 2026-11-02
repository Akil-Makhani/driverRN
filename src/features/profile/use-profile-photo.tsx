/**
 * Everything the driver can do with their photo, for any screen that shows it:
 * view it large, take or pick a new one, remove it. Profile and the dashboard
 * share this, so the two cannot drift apart.
 */
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, Primary } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { UserRepository } from '@/core/services/user-repository';
import { useSession } from '@/core/session';
import { type PhotoAction, PhotoOptionsSheet } from './photo-options-sheet';

export function useProfilePhoto() {
  /** The photo full screen; opened by tapping it. */
  const [viewerOpen, setViewerOpen] = useState(false);
  /** Take / choose / view / remove the photo. */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  /**
   * The cropped photo, waiting for the driver to press Add photo. The crop
   * screen's own button only finishes the crop, so nothing is uploaded until
   * the driver has seen the result and said yes.
   */
  const [pending, setPending] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const url = useSession((s) => s.user?.profilePhotoUrl);
  const hasPhoto = !!url;

  /** Runs a photo change, with the spinner on the avatar and one failure message. */
  const runPhoto = async (work: () => Promise<boolean>) => {
    setBusy(true);
    try {
      if (!(await work())) Alert.alert(Strings.profilePhotoTitle, Strings.profilePhotoFailed);
    } catch {
      Alert.alert(Strings.profilePhotoTitle, Strings.profilePhotoFailed);
    } finally {
      setBusy(false);
    }
  };

  const pick = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(Strings.profilePhotoTitle, Strings.registerPhotoPermission);
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      // A face, cropped square: it is shown in a circle everywhere.
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || result.assets.length === 0) return;
    setPending(result.assets[0]);
  };

  const addPending = () => {
    const asset = pending;
    setPending(null);
    if (!asset) return;
    void runPhoto(() =>
      UserRepository.updateProfilePhoto(asset.uri, asset.mimeType ?? 'image/jpeg'),
    );
  };

  const choosePhoto = () => {
    if (!busy) setSheetOpen(true);
  };

  const onPhotoAction = (action: PhotoAction) => {
    if (action === 'view') {
      setViewerOpen(true);
    } else if (action === 'remove') {
      void runPhoto(() => UserRepository.removeProfilePhoto());
    } else {
      // Let the sheet finish sliding away before the camera / gallery opens
      // over it.
      setTimeout(() => void pick(action), 300);
    }
  };

  /** Tapping the photo: show it large, or go straight to adding one. */
  const showPhoto = () => {
    if (hasPhoto && !busy) setViewerOpen(true);
    else choosePhoto();
  };

  const overlays = (
    <>
      <PhotoOptionsSheet
        visible={sheetOpen}
        hasPhoto={hasPhoto}
        onClose={() => setSheetOpen(false)}
        onAction={onPhotoAction}
      />
      <PhotoViewer
        url={viewerOpen ? url : undefined}
        onClose={() => setViewerOpen(false)}
        onChange={() => {
          setViewerOpen(false);
          choosePhoto();
        }}
      />
      <PhotoConfirm
        uri={pending?.uri}
        onAdd={addPending}
        onPickAnother={() => {
          setPending(null);
          setSheetOpen(true);
        }}
        onClose={() => setPending(null)}
      />
    </>
  );

  return { hasPhoto, busy, showPhoto, choosePhoto, overlays };
}

/** The driver's photo on black, as large as the screen allows, with a close button. */
function PhotoViewer({
  url,
  onClose,
  onChange,
}: {
  /** Shown while set. */
  url?: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!url} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.viewer}>
        {url ? <Image source={{ uri: url }} style={styles.viewerImage} resizeMode="contain" /> : null}
        <Pressable
          onPress={onClose}
          style={[styles.viewerClose, { top: insets.top + 12 }]}
          hitSlop={12}
          accessibilityLabel={Strings.lrClose}
        >
          <Ionicons name="close" size={26} color={AppColors.white} />
        </Pressable>
        <Pressable onPress={onChange} style={[styles.viewerChange, { bottom: insets.bottom + 24 }]}>
          <Ionicons name="camera" size={18} color={AppColors.text} />
          <Text style={styles.viewerChangeText}>{Strings.profilePhotoChange}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/** The cropped photo in the circle it will be shown in, with Add photo to save it. */
function PhotoConfirm({
  uri,
  onAdd,
  onPickAnother,
  onClose,
}: {
  /** Shown while set. */
  uri?: string;
  onAdd: () => void;
  onPickAnother: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!uri} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.confirmScrim}>
        <View style={[styles.confirmCard, { marginBottom: insets.bottom }]}>
          <Pressable
            onPress={onClose}
            style={styles.confirmClose}
            hitSlop={12}
            accessibilityLabel={Strings.lrClose}
          >
            <Ionicons name="close" size={22} color={AppColors.text} />
          </Pressable>
          <Text style={styles.confirmTitle}>{Strings.profilePhotoConfirmTitle}</Text>
          {uri ? <Image source={{ uri }} style={styles.confirmPhoto} /> : null}
          <Text style={styles.confirmHint}>{Strings.profilePhotoConfirmHint}</Text>
          <Pressable onPress={onAdd} style={styles.confirmAdd}>
            <Ionicons name="checkmark-circle" size={20} color={AppColors.white} />
            <Text style={styles.confirmAddText}>{Strings.profilePhotoAdd}</Text>
          </Pressable>
          <Pressable onPress={onPickAnother} style={styles.confirmAnother}>
            <Ionicons name="images-outline" size={18} color={AppColors.primary} />
            <Text style={styles.confirmAnotherText}>{Strings.profilePhotoPickAnother}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerClose: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerChange: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: AppColors.white,
  },
  viewerChangeText: { ...Typography.button2.extraBold, color: AppColors.text },
  confirmScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    backgroundColor: AppColors.white,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
  },
  confirmClose: { position: 'absolute', top: 12, right: 12, padding: 4 },
  confirmTitle: { ...Typography.subtitle1.extraBold, color: AppColors.text },
  confirmPhoto: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginTop: 18,
    borderWidth: 3,
    borderColor: Primary.c100,
  },
  confirmHint: {
    ...Typography.body2.medium,
    color: AppColors.text,
    textAlign: 'center',
    marginTop: 14,
  },
  confirmAdd: {
    alignSelf: 'stretch',
    height: 50,
    marginTop: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AppColors.primary,
  },
  confirmAddText: { ...Typography.button2.extraBold, color: AppColors.white },
  confirmAnother: {
    alignSelf: 'stretch',
    height: 48,
    marginTop: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Primary.c300,
  },
  confirmAnotherText: { ...Typography.button2.extraBold, color: AppColors.primary },
});
