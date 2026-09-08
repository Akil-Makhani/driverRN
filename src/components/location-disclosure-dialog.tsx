/**
 * Google Play's "prominent disclosure" for background location.
 *
 * Play policy requires this to appear BEFORE the OS permission prompt, not
 * alongside or after it: the app was rejected once for calling
 * requestBackgroundPermissionsAsync() straight from the duty toggle, so the
 * system dialog was the first thing a driver saw.
 *
 * The copy has to name the data ("location"), state that collection continues
 * when the app is closed or not in use, and give the purpose — those exact
 * points are what a reviewer checks for. Declining must be a real choice, so
 * "Not now" leaves the driver on duty with tracking simply off rather than
 * blocking the toggle.
 */
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';

interface Props {
  visible: boolean;
  /** Driver accepted — the caller then requests the OS permission. */
  onAccept: () => void;
  /** Driver declined. Duty still changes; tracking stays off. */
  onDecline: () => void;
}

export function LocationDisclosureDialog({ visible, onAccept, onDecline }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Hardware back counts as declining, never as silent consent.
      onRequestClose={onDecline}
    >
      {/* Deliberately not dismissable by tapping the scrim: consent has to be
          an explicit choice between the two buttons. */}
      <View style={styles.scrim}>
        <View style={[styles.card, { marginBottom: insets.bottom }]}>
          <Text style={styles.title}>{Strings.locationDisclosureTitle}</Text>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>{Strings.locationDisclosureBody}</Text>
            <Text style={styles.body}>{Strings.locationDisclosureUsage}</Text>
            <Text style={styles.body}>{Strings.locationDisclosureControl}</Text>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onDecline} style={styles.declineButton}>
              <Text style={styles.declineText}>
                {Strings.locationDisclosureDecline}
              </Text>
            </Pressable>
            <View style={styles.actionGap} />
            <Pressable onPress={onAccept} style={styles.acceptButton}>
              <Text style={styles.acceptText}>
                {Strings.locationDisclosureAccept}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: AppColors.white,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    ...Typography.h4.extraBold,
    color: AppColors.text,
    marginBottom: 12,
  },
  bodyScroll: { flexGrow: 0 },
  body: {
    ...Typography.body1.regular,
    color: TextShade.c800,
    lineHeight: 22,
    marginBottom: 12,
  },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  actionGap: { width: 12 },
  declineButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { ...Typography.button2.extraBold, color: AppColors.primary },
  acceptButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { ...Typography.button2.extraBold, color: AppColors.white },
});
