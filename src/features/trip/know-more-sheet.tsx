/**
 * The explainer behind the "KNOW MORE" link on the status banner.
 *
 * Flutter drew know_more.png as a bare Image with no tap handler anywhere in
 * the codebase, so there is no original behaviour to port — this is new. The
 * copy expands on the one-line banner subtitle, keyed to the same status.
 */
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { TripStatusNumber } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';

interface Props {
  visible: boolean;
  /** Trip statusNumber — picks which explanation to show. */
  status: number;
  /** True once the load is confirmed; status 3 covers both loading and transit. */
  isOrderLoaded?: boolean;
  onClose: () => void;
}

export function KnowMoreSheet({ visible, status, isOrderLoaded, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { title, body } = copyFor(status, isOrderLoaded);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Tapping the dimmed area closes, matching the confirm-load sheet. */}
      <Pressable style={styles.scrim} onPress={onClose}>
        {/* Swallows taps on the sheet itself so they do not close it. */}
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>{body}</Text>
          </ScrollView>
          <Pressable onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>{Strings.gotIt}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Mirrors the banner's own status mapping. Status 3 splits on isOrderLoaded:
 * before confirming the driver is still reconciling the load, after it they
 * are driving to the delivery.
 */
function copyFor(status: number, isOrderLoaded?: boolean): { title: string; body: string } {
  switch (status) {
    case TripStatusNumber.assigned:
      return { title: Strings.knowMoreAcceptTitle, body: Strings.knowMoreAcceptBody };
    case TripStatusNumber.accepted:
      return { title: Strings.knowMorePickupTitle, body: Strings.knowMorePickupBody };
    case TripStatusNumber.pickup:
      return isOrderLoaded
        ? { title: Strings.knowMoreTransitTitle, body: Strings.knowMoreTransitBody }
        : { title: Strings.knowMoreLoadingTitle, body: Strings.knowMoreLoadingBody };
    case TripStatusNumber.inTransit:
      return { title: Strings.knowMoreTransitTitle, body: Strings.knowMoreTransitBody };
    case TripStatusNumber.delivered:
      return { title: Strings.knowMoreDeliveredTitle, body: Strings.knowMoreDeliveredBody };
    default:
      return { title: Strings.knowMore, body: '' };
  }
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    maxHeight: '75%',
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Primary.c300,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { ...Typography.h4.extraBold, color: AppColors.text, marginBottom: 10 },
  bodyScroll: { flexGrow: 0 },
  body: { ...Typography.body1.regular, color: TextShade.c800, lineHeight: 22 },
  button: {
    height: 50,
    marginTop: 20,
    borderRadius: 8,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { ...Typography.button2.extraBold, color: AppColors.white },
});
