/**
 * Asked when the driver taps DELIVERED: which vehicle actually delivered the
 * load. The choice is sent with the status change and stored on the trip.
 * Styled after ConfirmDialog so the two read as one family.
 */
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { AppColors, TextShade } from '@/core/constants/colors';
import { DeliveredVia, type DeliveredViaValue } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';

interface Props {
  visible: boolean;
  onSelect: (via: DeliveredViaValue) => void;
  onCancel: () => void;
}

// A function, not a constant, so the labels follow a language change.
const options = (): { value: DeliveredViaValue; label: string }[] => [
  { value: DeliveredVia.tajMahal, label: Strings.deliveredViaTajMahal },
  { value: DeliveredVia.tempo, label: Strings.deliveredViaTempo },
];

export function DeliveredViaDialog({ visible, onSelect, onCancel }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.scrim} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{Strings.deliveredViaTitle}</Text>
          <Text style={styles.message}>{Strings.deliveredViaMessage}</Text>
          {options().map((o) => (
            <Pressable
              key={o.value}
              onPress={() => onSelect(o.value)}
              style={styles.option}
            >
              <Text style={styles.optionText}>{o.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onCancel} style={styles.cancel} hitSlop={4}>
            <Text style={styles.cancelText}>{Strings.dialogCancel}</Text>
          </Pressable>
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
  message: {
    ...Typography.body1.regular,
    color: AppColors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  option: {
    height: 50,
    borderRadius: 8,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  optionText: { ...Typography.body1.bold, color: AppColors.white },
  cancel: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 },
  cancelText: { ...Typography.body1.medium, color: TextShade.c700 },
});
