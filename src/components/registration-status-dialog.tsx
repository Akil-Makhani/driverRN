/**
 * The one popup the registration flow ends in, in four guises: waiting on the
 * admin, approved, rejected, or "this vehicle/licence is already on file".
 *
 * Built as a controlled component like ConfirmDialog rather than an imperative
 * `showDialog()`, so the caller owns both the visibility and what each action
 * does — the register screen and the login screen want different navigation
 * out of the same popup.
 */
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import type { RegistrationOutcome } from '@/features/auth/registration-store';

interface Props {
  outcome: RegistrationOutcome | null;
  onDismiss: () => void;
  /** "Go to login" — offered once there is an account to log into. */
  onGoToLogin?: () => void;
  /** "Edit details" — only offered after a rejection, to correct and resubmit. */
  onEdit?: () => void;
  /** "Register now" — only offered when there is no registration to speak of. */
  onRegister?: () => void;
}

/** Icon, tint and wash for each outcome. Tints come from AppColors as-is. */
const LOOK = {
  required: {
    icon: 'document-text-outline',
    tint: AppColors.primary,
    wash: Primary.c100,
    title: Strings.registerRequiredTitle,
  },
  pending: {
    icon: 'time-outline',
    tint: AppColors.primary,
    wash: Primary.c100,
    title: Strings.registerWaitingTitle,
  },
  approved: {
    icon: 'checkmark-circle-outline',
    tint: AppColors.success500,
    wash: AppColors.success50,
    title: Strings.registerApprovedTitle,
  },
  rejected: {
    icon: 'close-circle-outline',
    tint: AppColors.error500,
    wash: '#FEF3F2',
    title: Strings.registerRejectedTitle,
  },
  exists: {
    icon: 'information-circle-outline',
    tint: AppColors.primary,
    wash: Primary.c100,
    title: Strings.registerExistsTitle,
  },
} as const;

export function RegistrationStatusDialog({
  outcome,
  onDismiss,
  onGoToLogin,
  onEdit,
  onRegister,
}: Props) {
  // Rendering nothing when there is no outcome keeps the Modal unmounted
  // between showings, so it animates in each time rather than only the first.
  if (!outcome) return null;

  const look = LOOK[outcome.kind];
  // Approved is the only outcome with somewhere better to go than "dismiss";
  // for "already registered" the driver most likely already has an account.
  const showLogin =
    (outcome.kind === 'approved' || outcome.kind === 'exists') && onGoToLogin != null;
  const showEdit = outcome.kind === 'rejected' && onEdit != null;
  // The whole point of the "not registered yet" popup: the way out of it.
  const showRegister = outcome.kind === 'required' && onRegister != null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.scrim} onPress={onDismiss}>
        {/* Swallow taps inside the card so they do not dismiss it. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.iconWrap, { backgroundColor: look.wash }]}>
            <Ionicons name={look.icon} size={34} color={look.tint} />
          </View>

          <Text style={styles.title}>{look.title}</Text>
          <Text style={styles.message}>{outcome.message}</Text>

          {outcome.reason ? (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>
                {Strings.registerRejectedReasonLabel}
              </Text>
              <Text style={styles.reasonText}>{outcome.reason}</Text>
            </View>
          ) : null}

          {showLogin ? (
            <Pressable style={styles.primaryButton} onPress={onGoToLogin} hitSlop={4}>
              <Text style={styles.primaryText}>{Strings.registerGoToLogin}</Text>
            </Pressable>
          ) : null}

          {showEdit ? (
            <Pressable style={styles.primaryButton} onPress={onEdit} hitSlop={4}>
              <Text style={styles.primaryText}>{Strings.registerEditAndResubmit}</Text>
            </Pressable>
          ) : null}

          {showRegister ? (
            <Pressable style={styles.primaryButton} onPress={onRegister} hitSlop={4}>
              <Text style={styles.primaryText}>{Strings.registerNow}</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[
              styles.ghostButton,
              !showLogin && !showEdit && !showRegister && styles.ghostOnly,
            ]}
            onPress={onDismiss}
            hitSlop={4}
          >
            <Text style={styles.ghostText}>{Strings.registerOk}</Text>
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
    borderRadius: 16,
    backgroundColor: AppColors.white,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h4.bold,
    color: AppColors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    marginTop: 8,
    textAlign: 'center',
  },
  reasonBox: {
    alignSelf: 'stretch',
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEF3F2',
  },
  reasonLabel: { ...Typography.caption.bold, color: AppColors.error600 },
  reasonText: {
    ...Typography.body2.regular,
    color: AppColors.text,
    marginTop: 4,
  },
  primaryButton: {
    alignSelf: 'stretch',
    marginTop: 20,
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  primaryText: { ...Typography.button2.extraBold, color: AppColors.white },
  ghostButton: { alignSelf: 'stretch', marginTop: 8, padding: 12, alignItems: 'center' },
  /** Sole action: give it the same breathing room the primary button has. */
  ghostOnly: { marginTop: 20 },
  ghostText: { ...Typography.button2.extraBold, color: TextShade.c700 },
});
