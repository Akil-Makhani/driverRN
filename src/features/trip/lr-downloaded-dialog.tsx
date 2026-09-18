/**
 * Confirmation shown after a Lorry Receipt is saved.
 *
 * A save is a good outcome the driver should be able to read at a glance, so
 * this leads with a green tick rather than the plain system alert used for
 * failures — and it names where the file went, which is the one thing a driver
 * needs afterwards.
 */
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';

interface Props {
  visible: boolean;
  /** Where the copy landed — the shared Downloads folder, or the app's own. */
  savedToDownloads: boolean;
  fileName: string;
  onDismiss: () => void;
}

export function LrDownloadedDialog({
  visible,
  savedToDownloads,
  fileName,
  onDismiss,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.scrim} onPress={onDismiss}>
        {/* Stop taps inside the card from reaching the scrim. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.badge}>
            <Ionicons name="checkmark" size={32} color={AppColors.white} />
          </View>

          <Text style={styles.title}>{Strings.lrDownloadSuccess}</Text>

          <Text style={styles.location}>
            {savedToDownloads ? Strings.lrSavedToDownloads : Strings.lrSavedOnPhone}
          </Text>

          <View style={styles.fileRow}>
            <Ionicons
              name="document-text-outline"
              size={16}
              color={AppColors.primary}
            />
            <Text style={styles.fileName} numberOfLines={1}>
              {fileName}
            </Text>
          </View>

          <Pressable onPress={onDismiss} style={styles.button}>
            <Text style={styles.buttonText}>{Strings.lrDownloadedOkay}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    backgroundColor: AppColors.white,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.success500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h4.bold,
    color: AppColors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  location: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    marginTop: 6,
    textAlign: 'center',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: AppColors.secondary100,
    borderWidth: 1,
    borderColor: Primary.c300,
  },
  fileName: {
    ...Typography.body2.semiBold,
    color: AppColors.text,
    flexShrink: 1,
  },
  button: {
    alignSelf: 'stretch',
    height: 46,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
  },
  buttonText: { ...Typography.button2.extraBold, color: AppColors.white },
});
