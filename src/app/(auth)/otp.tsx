/**
 * Port of lib/screens/login_otp/view/otp_screen.dart +
 * sub_view/{otp_bottom_view,otp_section}.dart.
 *
 * Flutter's `pinput` is replaced by react-native-otp-entry; the pin theming
 * (default / focused / error) maps onto its style props.
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { OtpInput } from 'react-native-otp-entry';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Images } from '@/core/constants/assets';
import { AppColors, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { takePendingTrip } from '@/core/services/notification-manager';
import { formatTimer, useAuthStore } from '@/features/auth/auth-store';
import { LoginTopImages } from '@/features/auth/login-top-images';
import { useRegistrationStore } from '@/features/auth/registration-store';
import { useDashboardStore } from '@/features/dashboard/dashboard-store';

export default function OtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mobile } = useLocalSearchParams<{ mobile: string }>();

  const isLoading = useAuthStore((s) => s.isLoading);
  const isOtpInvalid = useAuthStore((s) => s.isOtpInvalid);
  const isResendAvailable = useAuthStore((s) => s.isResendAvailable);
  const secondsRemaining = useAuthStore((s) => s.secondsRemaining);
  const otpPurpose = useAuthStore((s) => s.otpPurpose);
  const isVerifyingRegistration = useRegistrationStore((s) => s.isCheckingStatus);

  // Stop the countdown if the driver backs out before verifying.
  useEffect(() => () => useAuthStore.getState().stopTimer(), []);

  /**
   * A number with no account took the registration OTP instead, so verifying
   * it opens the sign-up form rather than the dashboard — this is the point
   * where the two paths that share this screen separate.
   */
  const onVerifyRegistration = async () => {
    const otp = useAuthStore.getState().otp;
    if (otp.length < 4) {
      useAuthStore.getState().setOtpInvalid(true);
      return;
    }

    const next = await useRegistrationStore.getState().verifyOtp(mobile, otp);
    if (next == null) {
      useAuthStore.getState().setOtpInvalid(true);
      return;
    }

    useAuthStore.getState().stopTimer();
    // 'form' and 'rejected' both have a form to fill in; 'pending' and
    // 'approved' have nothing to do but read the popup, which login renders.
    router.replace(
      next === 'form' || next === 'rejected'
        ? '/(auth)/register'
        : '/(auth)/login',
    );
  };

  const onVerify = async () => {
    if (otpPurpose === 'registration') {
      await onVerifyRegistration();
      return;
    }

    if (!(await useAuthStore.getState().verifyOTP(mobile))) return;

    useDashboardStore.getState().syncDutyFromSession();
    const tripId = takePendingTrip();
    router.replace('/dashboard');
    if (tripId) router.push(`/trip/${tripId}`);
  };

  return (
    <View style={styles.screen}>
      {/* Hardware back only dismisses the keyboard on the first press here, so
          a driver who mistyped their number had no obvious way out. Floats over
          the artwork rather than taking a header row, which would push the
          sheet down on short screens. */}
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
        hitSlop={12}
        style={[styles.back, { top: insets.top + 8 }]}
      >
        <Ionicons name="arrow-back" size={24} color={AppColors.text} />
      </Pressable>

      {/* Same structure as login: the sheet scrolls with the page so the OTP
          boxes lift clear of the keyboard instead of sitting under it. */}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBlock}>
          <LoginTopImages />
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 5 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{Strings.verifyMobile}</Text>
            <Text style={styles.subtitle}>
              {Strings.oneTimeString}
              <Text style={styles.subtitleBold}>{mobile}</Text>
            </Text>
          </View>
          <Image source={Images.loginImage} style={styles.headerImage} />
        </View>

        <View style={styles.otpWrap}>
          <OtpInput
            numberOfDigits={4}
            focusColor={AppColors.primary}
            autoFocus
            onTextChange={(text) => useAuthStore.getState().setOtp(text)}
            onFilled={onVerify}
            theme={{
              containerStyle: styles.otpContainer,
              // The library types this as a single ViewStyle, not a style
              // array, so the error variant is merged rather than appended.
              pinCodeContainerStyle: isOtpInvalid
                ? { ...styles.pinBox, ...styles.pinBoxError }
                : styles.pinBox,
              pinCodeTextStyle: styles.pinText,
              focusedPinCodeContainerStyle: styles.pinBoxFocused,
            }}
          />
        </View>

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>{Strings.resendOTPText}</Text>
          <Text style={styles.resendTimer}>{formatTimer(secondsRemaining)}</Text>
          <Pressable
            onPress={() => useAuthStore.getState().resendOtp(mobile)}
            disabled={!isResendAvailable}
            style={styles.resendButton}
            hitSlop={6}
          >
            <Text
              style={[
                styles.resendAction,
                { color: isResendAvailable ? AppColors.primary : TextShade.c700 },
              ]}
            >
              {Strings.resendOTP}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={onVerify} disabled={isLoading} style={styles.button}>
          <Text style={styles.buttonText}>{Strings.verify}</Text>
        </Pressable>
        </View>
      </KeyboardAwareScrollView>

      {(isLoading || isVerifyingRegistration) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  scroll: { flexGrow: 1 },
  /** Above the scroll view so it stays put when the keyboard lifts the sheet. */
  back: { position: 'absolute', left: 16, zIndex: 10, padding: 8 },
  topBlock: { flex: 1, justifyContent: 'flex-end', paddingTop: 20 },
  sheet: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 13.1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flex: 1 },
  title: { ...Typography.h4.bold, color: AppColors.text },
  subtitle: { ...Typography.body2.regular, color: TextShade.c700, marginTop: 7 },
  subtitleBold: Typography.body2.bold,
  headerImage: { width: 110, height: 90, marginLeft: 15, resizeMode: 'contain' },
  otpWrap: { marginTop: 15 },
  otpContainer: { justifyContent: 'flex-start', gap: 16 },
  pinBox: {
    width: 48,
    height: 48,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: TextShade.c200,
    backgroundColor: AppColors.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  pinBoxFocused: { borderColor: AppColors.primary },
  pinBoxError: { borderColor: AppColors.error500 },
  pinText: { ...Typography.h3.bold, color: AppColors.primary },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  resendLabel: { ...Typography.body2.regular, color: TextShade.c700 },
  resendTimer: { ...Typography.body2.bold, color: TextShade.c700 },
  resendButton: { marginLeft: 10, paddingVertical: 8 },
  resendAction: Typography.body2.extraBold,
  button: {
    marginTop: 5,
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: { ...Typography.button2.extraBold, color: AppColors.white },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
