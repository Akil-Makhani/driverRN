/**
 * The confirmation behind "Cancel this trip", with the reason for it.
 *
 * The app's own confirmation popup (ActionConfirmDialog), the same one behind
 * Vehicle There, In Transit, Delivered and the account actions, in the app's
 * primary colour. It used to be a one-off card with a solid red button, which
 * read as a different theme next to every other popup on the trip screen.
 *
 * Handing a trip back puts the order out to every other driver again and tells
 * the customer, so the office wants to know why. The driver picks one of the
 * common reasons, or "Other" and types it; YES, CANCEL stays greyed out until
 * there is one. The reason goes to the server in English whatever language
 * the driver reads the app in, because it is the office that reads it.
 *
 * KEEP TRIP is the left, outlined button and YES, CANCEL the filled one, as in
 * every other confirmation: the card tells the driver what is about to happen,
 * and a tap on the dimmed area or Android's back button still keeps the trip.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionConfirmDialog } from '@/components/action-confirm-dialog';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { en } from '@/core/i18n/en';

const REASONS = [
  'cancelReasonVehicle',
  'cancelReasonFar',
  'cancelReasonCustomer',
  'cancelReasonLoad',
  'cancelReasonEmergency',
  'cancelReasonOther',
] as const;

type ReasonKey = (typeof REASONS)[number];

interface Props {
  visible: boolean;
  /** Called with the reason, ready to send. */
  onConfirm: (reason: string) => void;
  /** Also fires on a tap outside the card and on Android's back button. */
  onCancel: () => void;
}

export function CancelTripDialog({ visible, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<ReasonKey | null>(null);
  const [otherText, setOtherText] = useState('');

  // Every opening starts blank, so a reason picked for an earlier attempt is
  // not sent by a quick tap on YES, CANCEL.
  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setOtherText('');
  }, [visible]);

  const isOther = selected === 'cancelReasonOther';
  const reason = !selected ? '' : isOther ? otherText.trim() : en[selected];

  return (
    <ActionConfirmDialog
      visible={visible}
      tone="primary"
      icon="truck-remove-outline"
      label={Strings.cancelTripLabel}
      title={Strings.cancelTripTitle}
      message={Strings.cancelTripBody}
      cancelLabel={Strings.cancelTripDismiss}
      cancelIcon="arrow-left"
      confirmLabel={Strings.cancelTripConfirm}
      confirmIcon="close-circle-outline"
      confirmDisabled={!reason}
      onConfirm={() => {
        if (reason) onConfirm(reason);
      }}
      onCancel={onCancel}
    >
      <View style={styles.reasons}>
        <Text style={styles.prompt}>{Strings.cancelReasonPrompt}</Text>
        {REASONS.map((key) => {
          const active = selected === key;
          return (
            <Pressable
              key={key}
              onPress={() => setSelected(key)}
              style={[styles.option, active && styles.optionActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <MaterialCommunityIcons
                name={active ? 'radiobox-marked' : 'radiobox-blank'}
                size={20}
                color={active ? AppColors.primary : TextShade.c500}
              />
              <Text style={styles.optionText}>{Strings[key]}</Text>
            </Pressable>
          );
        })}
        {isOther && (
          <TextInput
            value={otherText}
            onChangeText={setOtherText}
            placeholder={Strings.cancelReasonPlaceholder}
            placeholderTextColor={TextShade.c500}
            style={styles.input}
            maxLength={300}
            multiline
            autoFocus
          />
        )}
      </View>
    </ActionConfirmDialog>
  );
}

const styles = StyleSheet.create({
  reasons: { alignSelf: 'stretch', marginTop: 14, gap: 6 },
  prompt: { ...Typography.body2.semiBold, color: AppColors.text, marginBottom: 2 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: TextShade.c200,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  optionActive: { borderColor: AppColors.primary, backgroundColor: Primary.c100 },
  optionText: { ...Typography.body2.semiBold, color: AppColors.text, flexShrink: 1 },
  input: {
    ...Typography.body2.regular,
    color: AppColors.text,
    borderWidth: 1,
    borderColor: Primary.c300,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 64,
    textAlignVertical: 'top',
  },
});
