/**
 * Port of CommonFunction.showLogoutDialog (lib/utility/common_function.dart).
 *
 * Dart called showDialog() imperatively from anywhere. RN modals must be
 * rendered, so this is a controlled component the caller mounts and toggles —
 * which also means the confirm action can be a plain closure rather than one
 * that has to pop the dialog itself.
 */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, TextShade } from '@/core/constants/colors';
import { Typography } from '@/core/constants/typography';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  /** Label of the destructive action ("Logout", "Delete"). */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Android hardware back must dismiss, matching a Flutter barrier dialog.
      onRequestClose={onCancel}
    >
      <Pressable style={styles.scrim} onPress={onCancel}>
        {/* Stop taps inside the card from reaching the scrim. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.action} hitSlop={4}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={styles.action} hitSlop={4}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    backgroundColor: AppColors.white,
    padding: 24,
  },
  title: { ...Typography.h4.bold, color: AppColors.text },
  message: { ...Typography.body1.regular, color: AppColors.text, marginTop: 12 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 20,
  },
  action: { paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8 },
  cancelText: { ...Typography.body1.medium, color: TextShade.c700 },
  confirmText: { ...Typography.body1.bold, color: AppColors.error500 },
});
