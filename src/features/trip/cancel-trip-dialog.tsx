/**
 * The confirmation behind "Cancel this trip".
 *
 * Not the system Alert: that renders in the OS's own colours, which on this
 * screen sat next to the app's dark teal buttons looking like it belonged to a
 * different app. This is the same modal-over-scrim pattern the rest of the app
 * already uses (know-more sheet, confirm dialog), and "Keep trip" is not
 * merely styled like the VEHICLE THERE button — it IS that button, from the
 * shared PrimaryButton token, so the two can no longer drift apart.
 *
 * Keep trip is the filled, primary action on purpose. The destructive one is
 * outlined and second: a driver who opened this by accident should be able to
 * get out of it by pressing the biggest thing on screen.
 *
 * The card springs in rather than appearing: this interrupts a driver holding
 * a phone in a cab, and a beat of movement is what makes it read as a question
 * being asked rather than a screen that was already there.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/core/constants/buttons';
import { AppColors, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  /** Also fires on a tap outside the card and on Android's back button. */
  onCancel: () => void;
}

export function CancelTripDialog({ visible, onConfirm, onCancel }: Props) {
  // Kept mounted through the exit animation — unmounting on `visible` alone
  // would snap the card away instead of letting it settle back.
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(progress, {
        toValue: 1,
        damping: 18,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, progress]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel}>
      {/* Tapping the dimmed area dismisses, as it does on every other sheet. */}
      <Pressable style={styles.scrimTouch} onPress={onCancel}>
        <Animated.View style={[styles.scrim, { opacity: progress }]} />

        <Animated.View
          style={[
            styles.cardWrap,
            {
              opacity: progress,
              transform: [
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
              ],
            },
          ]}
        >
          {/* Swallows taps on the card so they never reach the scrim. */}
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.iconCircle}>
              <Ionicons name="alert" size={26} color={AppColors.error600} />
            </View>

            <Text style={styles.title}>{Strings.cancelTripTitle}</Text>
            <Text style={styles.message}>{Strings.cancelTripBody}</Text>

            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.keepButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={18} color={AppColors.white} />
              <Text style={styles.keepText}>{Strings.cancelTripDismiss}</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={18} color={AppColors.white} />
              <Text style={styles.cancelText}>{Strings.cancelTripConfirm}</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrimTouch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  // Separate from the touch target so its opacity can animate independently
  // of the card's spring.
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cardWrap: { width: '100%', maxWidth: 400 },
  card: {
    borderRadius: 16,
    backgroundColor: AppColors.white,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE4E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...Typography.h4.extraBold,
    color: AppColors.text,
    textAlign: 'center',
  },
  message: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 22,
  },
  // The VEHICLE THERE button, exactly — same token the bottom bar renders.
  keepButton: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    ...PrimaryButton.shape,
  },
  keepText: { ...PrimaryButton.label },
  pressed: { opacity: 0.85 },
  // Solid red rather than an outline. An outlined button next to a filled one
  // reads as the lesser option, and this one ends the trip — it should look
  // like as deliberate a choice as keeping it, just unmistakably the other one.
  cancelButton: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: AppColors.error600,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelText: { ...Typography.button2.extraBold, color: AppColors.white },
});
