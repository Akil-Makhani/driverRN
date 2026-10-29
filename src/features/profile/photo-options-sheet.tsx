/**
 * What can be done with the driver's photo, as a bottom sheet: take one, pick
 * one from the gallery, look at the current one, or remove it (asked twice, so
 * a stray tap does not wipe it).
 */
import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DriverAvatar } from '@/components/driver-avatar';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';

export type PhotoAction = 'camera' | 'library' | 'view' | 'remove';

interface Props {
  visible: boolean;
  hasPhoto: boolean;
  onClose: () => void;
  /** Called after the sheet has started closing. */
  onAction: (action: PhotoAction) => void;
}

export function PhotoOptionsSheet({ visible, hasPhoto, onClose, onAction }: Props) {
  const insets = useSafeAreaInsets();
  const [confirmRemove, setConfirmRemove] = useState(false);
  useEffect(() => {
    if (visible) setConfirmRemove(false);
  }, [visible]);

  const choose = (action: PhotoAction) => {
    onClose();
    onAction(action);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <DriverAvatar style={styles.headerAvatar} />
            <View style={styles.headerText}>
              <Text style={styles.title}>{Strings.profilePhotoTitle}</Text>
              <Text style={styles.subtitle}>{Strings.profilePhotoSheetHint}</Text>
            </View>
          </View>

          {confirmRemove ? (
            <View style={styles.confirm}>
              <View style={[styles.optionIcon, { backgroundColor: '#FEE4E2' }]}>
                <Ionicons name="trash" size={22} color={AppColors.error500} />
              </View>
              <Text style={styles.confirmTitle}>{Strings.profilePhotoRemoveConfirm}</Text>
              <Text style={styles.confirmBody}>{Strings.profilePhotoRemoveHint}</Text>
              <View style={styles.confirmButtons}>
                <Pressable onPress={() => setConfirmRemove(false)} style={[styles.confirmButton, styles.keepButton]}>
                  <Text style={styles.keepText}>{Strings.registerPhotoCancel}</Text>
                </Pressable>
                <Pressable onPress={() => choose('remove')} style={[styles.confirmButton, styles.removeButton]}>
                  <Text style={styles.removeText}>{Strings.profilePhotoRemoveYes}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Option
                icon="camera"
                tint="#1570EF"
                bg="#D1E9FF"
                title={Strings.registerPhotoCamera}
                hint={Strings.profilePhotoCameraHint}
                onPress={() => choose('camera')}
              />
              <Option
                icon="images"
                tint="#7A5AF8"
                bg="#EBE9FE"
                title={Strings.registerPhotoGallery}
                hint={Strings.profilePhotoGalleryHint}
                onPress={() => choose('library')}
              />
              {hasPhoto ? (
                <>
                  <Option
                    icon="expand"
                    tint={AppColors.success500}
                    bg={AppColors.success50}
                    title={Strings.profilePhotoView}
                    hint={Strings.profilePhotoViewHint}
                    onPress={() => choose('view')}
                  />
                  <Option
                    icon="trash"
                    tint={AppColors.error500}
                    bg="#FEE4E2"
                    title={Strings.profilePhotoRemove}
                    hint={Strings.profilePhotoRemoveHint}
                    danger
                    onPress={() => setConfirmRemove(true)}
                  />
                </>
              ) : null}

              <Pressable onPress={onClose} style={styles.cancel}>
                <Text style={styles.cancelText}>{Strings.registerPhotoCancel}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Option({
  icon,
  tint,
  bg,
  title,
  hint,
  danger,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  tint: string;
  bg: string;
  title: string;
  hint: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed ? styles.optionPressed : null]}
      android_ripple={{ color: Primary.c100 }}
    >
      <View style={[styles.optionIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, danger ? { color: AppColors.error500 } : null]}>{title}</Text>
        <Text style={styles.optionHint}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={TextShade.c500} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
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
  headerAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: Primary.c200 },
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
  confirm: { alignItems: 'center', paddingTop: 8 },
  confirmTitle: { ...Typography.subtitle1.extraBold, color: AppColors.text, marginTop: 12, textAlign: 'center' },
  confirmBody: { ...Typography.body2.medium, color: TextShade.c700, marginTop: 4, textAlign: 'center' },
  confirmButtons: { flexDirection: 'row', gap: 12, marginTop: 20, alignSelf: 'stretch' },
  confirmButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  keepButton: { backgroundColor: Primary.c100 },
  keepText: { ...Typography.button2.extraBold, color: AppColors.primary },
  removeButton: { backgroundColor: AppColors.error500 },
  removeText: { ...Typography.button2.extraBold, color: AppColors.white },
});
