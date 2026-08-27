/**
 * Port of lib/screens/login_otp/view/otp_screen.dart +
 * sub_view/{otp_bottom_view,otp_section}.dart.
 *
 * Flutter's `pinput` is replaced by react-native-otp-entry; the pin theming
 * (default / focused / error) maps onto its style props.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { OtpInput } from 'react-native-otp-entry';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Images } from '@/core/constants/assets';
import { AppColors, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { takePendingTrip } from '@/core/services/notification-manager';
import { formatTimer, useAuthStore } from '@/features/auth/auth-store';
import { LoginTopImages } from '@/features/auth/login-top-images';
import { useDashboardStore } from '@/features/dashboard/dashboard-store';

export default function OtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mobile } = useLocalSearchParams<{ mobile: string }>();

  const isLoading = useAuthStore((s) => s.isLoading);
  const isOtpInvalid = useAuthStore((s) => s.isOtpInvalid);
  const isResendAvailable = useAuthStore((s) => s.isResendAvailable);
  const secondsRemaining = useAuthStore((s) => s.secondsRemaining);

  // Stop the countdown if the driver backs out before verifying.
  useEffect(() => () => useAuthStore.getState().stopTimer(), []);

  const onVerify = async () => {
    if (!(await useAuthStore.getState().verifyOTP(mobile))) return;

    useDashboardStore.getState().syncDutyFromSession();
    const tripId = takePendingTrip();
    router.replace('/dashboard');
    if (tripId) router.push(`/trip/${tripId}`);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LoginTopImages />
      </ScrollView>

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

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  scroll: { flexGrow: 1, paddingTop: 20 },
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
