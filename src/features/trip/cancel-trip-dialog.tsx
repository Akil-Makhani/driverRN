/**
 * The confirmation behind "Cancel this trip".
 *
 * The app's own confirmation popup (ActionConfirmDialog), the same one behind
 * Vehicle There, In Transit, Delivered and the account actions, in the app's
 * primary colour. It used to be a one-off card with a solid red button, which
 * read as a different theme next to every other popup on the trip screen.
 *
 * KEEP TRIP is the left, outlined button and YES, CANCEL the filled one, as in
 * every other confirmation: the card tells the driver what is about to happen,
 * and a tap on the dimmed area or Android's back button still keeps the trip.
 */
import { ActionConfirmDialog } from '@/components/action-confirm-dialog';
import { Strings } from '@/core/constants/strings';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  /** Also fires on a tap outside the card and on Android's back button. */
  onCancel: () => void;
}

export function CancelTripDialog({ visible, onConfirm, onCancel }: Props) {
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
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
