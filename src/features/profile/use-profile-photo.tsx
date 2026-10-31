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

import { AppColors } from '@/core/constants/colors';
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
    const asset = result.assets[0];
    await runPhoto(() =>
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
});
