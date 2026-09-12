/**
 * Tells the driver their LR is saved, and where.
 *
 * The same popup as the trip's step confirmations (ActionConfirmDialog, in the
 * app's primary colour), in place of the system alert this used to be: the
 * alert's plain grey text buttons made OPEN easy to miss, and a driver at a
 * gate needs to see at a glance that the download worked.
 */
import { ActionConfirmDialog } from '@/components/action-confirm-dialog';
import { Strings } from '@/core/constants/strings';

interface Props {
  visible: boolean;
  lrNumber?: string;
  /** Whether the copy also went into Downloads › BST LR, which decides the message. */
  savedToDownloads: boolean;
  onClose: () => void;
  /** Omitted where the LR is already on screen (the viewer itself). */
  onOpen?: () => void;
}

export function LrDownloadedDialog({ visible, lrNumber, savedToDownloads, onClose, onOpen }: Props) {
  return (
    <ActionConfirmDialog
      visible={visible}
      tone="primary"
      icon="file-check-outline"
      label={Strings.lrDownloadedLabel}
      title={Strings.lrDownloadedTitle}
      message={savedToDownloads ? Strings.lrDownloadedToFolder : Strings.lrDownloadedInApp}
      details={lrNumber ? [lrNumber] : undefined}
      cancelLabel={Strings.lrClose}
      onCancel={onClose}
      // No OPEN where the LR is already open; the popup then has CLOSE alone.
      confirmLabel={onOpen ? Strings.lrOpen : undefined}
      confirmIcon="open-in-new"
      onConfirm={onOpen}
    />
  );
}
