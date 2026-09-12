/**
 * "Are you sure?" before a step that tells someone else something — the office,
 * the customer, the other drivers — and cannot be taken back from the app.
 *
 * A coloured icon and two full-size buttons rather than ConfirmDialog's text
 * links, because these are tapped in a cab, often in a hurry,
 * and ConfirmDialog's small grey text buttons were easy to miss or mis-hit.
 * The trip steps and the offer answers all use the 'primary' tone, so every
 * confirmation reads as part of the app's own theme; the icon and wording are
 * what tell one step from another. The other tones remain for a dialog that
 * needs to stand apart.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Typography } from '@/core/constants/typography';

export type ConfirmTone = 'primary' | 'warning' | 'success' | 'danger';

/** Strong colour for the icon, label and confirm button; soft wash and ring behind the icon. */
const TONES: Record<ConfirmTone, { strong: string; soft: string; ring: string }> = {
  primary: { strong: AppColors.primary, soft: Primary.c100, ring: Primary.c300 },
  warning: { strong: '#F79009', soft: '#FFFAEB', ring: '#FEC84B' },
  success: { strong: AppColors.success500, soft: AppColors.success50, ring: AppColors.success300 },
  danger: { strong: AppColors.error500, soft: '#FEF3F2', ring: '#FDA29B' },
};

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface Props {
  visible: boolean;
  tone: ConfirmTone;
  icon: IconName;
  /** Small coloured caption over the title naming the step, e.g. "VEHICLE THERE". */
  label?: string;
  title: string;
  message: string;
  /** Key facts about what is being confirmed, one short line each. */
  details?: string[];
  /** A live note beside the label, e.g. the seconds left on an offer. */
  badge?: string;
  /**
   * Omit confirmLabel and onConfirm for a message with nothing to confirm (an
   * LR that has just downloaded, shown where it is already open): the dialog
   * then has a single button, drawn solid, that closes it.
   */
  confirmLabel?: string;
  confirmIcon?: IconName;
  cancelLabel: string;
  cancelIcon?: IconName;
  onConfirm?: () => void;
  onCancel: () => void;
}

export function ActionConfirmDialog({
  visible,
  tone,
  icon,
  label,
  title,
  message,
  details,
  badge,
  confirmLabel,
  confirmIcon = 'check',
  cancelLabel,
  cancelIcon = 'close',
  onConfirm,
  onCancel,
}: Props) {
  const colors = TONES[tone];
  const hasConfirm = Boolean(confirmLabel && onConfirm);
  // With nothing to confirm, the one button is the whole answer, so it is
  // drawn solid instead of as the quiet outlined alternative.
  const cancelTint = hasConfirm ? TextShade.c800 : AppColors.white;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // Android hardware back cancels, like every other dialog in the app.
      onRequestClose={onCancel}
    >
      <Pressable style={styles.scrim} onPress={onCancel}>
        {/* Stop taps inside the card from reaching the scrim. */}
        <Pressable style={[styles.card, { borderTopColor: colors.strong }]} onPress={() => {}}>
          <View style={[styles.iconWrap, { backgroundColor: colors.soft, borderColor: colors.ring }]}>
            <MaterialCommunityIcons name={icon} size={40} color={colors.strong} />
          </View>

          {(label || badge) && (
            <View style={styles.labelRow}>
              {!!label && (
                <View style={[styles.labelPill, { backgroundColor: colors.soft }]}>
                  <Text style={[styles.labelText, { color: colors.strong }]}>{label}</Text>
                </View>
              )}
              {!!badge && (
                <View style={[styles.badge, { borderColor: colors.ring }]}>
                  <MaterialCommunityIcons name="timer-sand" size={13} color={colors.strong} />
                  <Text style={[styles.badgeText, { color: colors.strong }]}>{badge}</Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {!!details?.length && (
            <View style={[styles.details, { backgroundColor: colors.soft }]}>
              {details.map((line) => (
                <Text key={line} style={styles.detailText} numberOfLines={2}>
                  {line}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                hasConfirm ? styles.cancelButton : [styles.soleButton, { backgroundColor: colors.strong }],
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons name={cancelIcon} size={18} color={cancelTint} />
              <Text style={[styles.buttonText, { color: cancelTint }]} numberOfLines={1}>
                {cancelLabel}
              </Text>
            </Pressable>
            {hasConfirm && (
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                { backgroundColor: colors.strong },
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons name={confirmIcon} size={18} color={AppColors.white} />
              <Text
                style={[styles.buttonText, { color: AppColors.white }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {confirmLabel}
              </Text>
            </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderTopWidth: 5,
    backgroundColor: AppColors.white,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  labelPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  labelText: { ...Typography.body2.extraBold, letterSpacing: 0.6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { ...Typography.body2.extraBold },
  title: {
    ...Typography.h4.extraBold,
    color: AppColors.text,
    textAlign: 'center',
    marginTop: 10,
  },
  message: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    textAlign: 'center',
    marginTop: 8,
  },
  details: {
    alignSelf: 'stretch',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
    gap: 4,
  },
  detailText: { ...Typography.body2.semiBold, color: AppColors.text },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22, alignSelf: 'stretch' },
  button: {
    height: 50,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: AppColors.white,
    borderWidth: 1.5,
    borderColor: TextShade.c200,
  },
  // The step itself gets the wider button: it is the one the driver came for.
  confirmButton: { flex: 1.4 },
  soleButton: { flex: 1 },
  pressed: { opacity: 0.8 },
  buttonText: { ...Typography.button2.extraBold },
});
