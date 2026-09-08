/**
 * The registration flow's own front door.
 *
 * Deliberately asks for the mobile number again rather than carrying the one
 * typed on the login screen: that field is there to get an existing driver in,
 * and reusing it made registering look like something that happened *to* the
 * number someone was trying to log in with. Here the driver states, once and
 * explicitly, which number they are signing up.
 *
 * Everything this screen needs is local — number, error, spinner — so nothing
 * it does can surface as state on the login screen behind it.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RegistrationStatusDialog } from '@/components/registration-status-dialog';
import { AppColors, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { digitsOnly, groupDigits } from '@/core/utils/number-format';
import { useAuthStore } from '@/features/auth/auth-store';
import { useRegistrationStore } from '@/features/auth/registration-store';

const MOBILE_LENGTH = 10;

export default function RegisterMobileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // "Already registered, go and log in" lands here rather than on login,
  // because this is the screen the driver pressed SEND OTP on.
  const outcome = useRegistrationStore((s) => s.outcome);

  const onSendOtp = async () => {
    Keyboard.dismiss();
    setError(null);
    setIsSending(true);
    const result = await useAuthStore.getState().startRegistration(mobile);
    setIsSending(false);

    if (!result.ok) {
      // No text means a popup is already explaining it.
      if (result.error) setError(result.error);
      return;
    }

    // The OTP screen is shared with login and reads the number from its params,
    // so the registration number never has to live in the auth store.
    useAuthStore.getState().resetOtp();
    useAuthStore.getState().startTimer();
    router.push({ pathname: '/(auth)/otp', params: { mobile } });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          hitSlop={12}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={24} color={AppColors.text} />
        </Pressable>

        <Text style={styles.title}>{Strings.registerMobileTitle}</Text>
        <Text style={styles.subtitle}>{Strings.registerMobileSubtitle}</Text>

        <Text style={styles.label}>{Strings.registerMobileLabel}</Text>
        <View style={styles.inputRow}>
          <Text style={styles.countryCode}>{`+ ${Strings.commonCountryCode}`}</Text>
          <TextInput
            style={styles.input}
            value={groupDigits(mobile)}
            onChangeText={(text) => {
              setMobile(digitsOnly(text, MOBILE_LENGTH));
              setError(null);
            }}
            keyboardType="number-pad"
            placeholder="12345 67890"
            placeholderTextColor={TextShade.c400}
            maxLength={11} // 10 digits + the group separator
            autoFocus
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={onSendOtp} disabled={isSending} style={styles.button}>
          <Text style={styles.buttonText}>{Strings.registerSendOtp}</Text>
        </Pressable>

        <Text style={styles.footNote}>{Strings.registerHaveAccount}</Text>
      </KeyboardAwareScrollView>

      {isSending && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      )}

      <RegistrationStatusDialog
        outcome={outcome}
        onDismiss={() => useRegistrationStore.getState().dismissOutcome()}
        onGoToLogin={() => {
          useRegistrationStore.getState().dismissOutcome();
          router.replace('/(auth)/login');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  scroll: { flexGrow: 1, padding: 16 },
  back: { alignSelf: 'flex-start', padding: 4, marginBottom: 12 },
  title: { ...Typography.h3.bold, color: AppColors.text },
  subtitle: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    marginTop: 8,
    lineHeight: 20,
  },
  label: {
    ...Typography.body2.bold,
    color: AppColors.text,
    marginTop: 28,
    marginBottom: 6,
  },
  inputRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: TextShade.c200,
  },
  countryCode: { ...Typography.body1.medium, color: AppColors.text },
  input: {
    flex: 1,
    marginLeft: 7,
    padding: 0,
    ...Typography.body1.medium,
    color: AppColors.text,
  },
  error: { ...Typography.body2.regular, color: AppColors.error600, marginTop: 10 },
  button: {
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { ...Typography.button2.extraBold, color: AppColors.white },
  footNote: {
    ...Typography.caption.regular,
    color: TextShade.c600,
    textAlign: 'center',
    marginTop: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
