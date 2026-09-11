/**
 * Port of lib/screens/login_otp/view/login_screen.dart +
 * sub_view/login_mobileno_view.dart.
 */
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Images } from '@/core/constants/assets';
import { AppColors, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { digitsOnly, groupDigits } from '@/core/utils/number-format';
import { useAuthStore } from '@/features/auth/auth-store';
import { LoginTopImages } from '@/features/auth/login-top-images';
import { useRegistrationStore } from '@/features/auth/registration-store';

const MOBILE_LENGTH = 10;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const mobile = useAuthStore((s) => s.mobile);
  const invalidMobile = useAuthStore((s) => s.invalidMobile);
  const errorMessage = useAuthStore((s) => s.errorMessage);
  const isLoading = useAuthStore((s) => s.isLoading);
  const onSubmit = async () => {
    if (mobile.length !== MOBILE_LENGTH) {
      useAuthStore.getState().setInvalidMobile(true);
      return;
    }
    useAuthStore.getState().setInvalidMobile(false);
    Keyboard.dismiss();

    const next = await useAuthStore.getState().sendOTP();

    // A number still waiting on the admin has no OTP to type; the waiting
    // screen is the answer, and it is where the decision will reach them.
    if (next === 'pending') {
      router.push('/(auth)/pending-approval');
      return;
    }

    if (next === 'otp') {
      useAuthStore.getState().resetOtp();
      useAuthStore.getState().startTimer();
      router.push({ pathname: '/(auth)/otp', params: { mobile } });
    }
    // A number with no account does not fail here: sendOTP quietly switches to
    // the registration OTP and answers 'otp', and the OTP screen then opens
    // the sign-up form instead of the dashboard. Anything that does fail — a
    // blocked account, no network — is already in errorMessage.
  };

  /**
   * Registration gets its own screen with its own number field. The number in
   * the field above is for logging in; carrying it over made signing up look
   * like something that happened to whatever had been typed for login.
   */
  const onRegister = () => {
    Keyboard.dismiss();
    router.push('/(auth)/register-mobile');
  };

  const showError = invalidMobile || errorMessage != null;

  return (
    <View style={styles.screen}>
      {/* The whole screen scrolls, sheet included, so a focused input can lift
          clear of the keyboard. With the sheet outside the ScrollView the
          keyboard simply covered it. `bottomOffset` leaves a gap above the
          keyboard, matching TruckRN's AuthScaffold. */}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Flexible so at rest the artwork fills the space above the sheet. */}
        <View style={styles.topBlock}>
          <LoginTopImages />
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 5 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{Strings.loginWelcomeMessage}</Text>
            <Text style={styles.subtitle}>{Strings.loginEnterMobile}</Text>
          </View>
          <Image source={Images.loginImage} style={styles.headerImage} />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.countryCode}>{`+ ${Strings.commonCountryCode}`}</Text>
          <TextInput
            style={styles.input}
            value={groupDigits(mobile)}
            onChangeText={(text) => {
              const digits = digitsOnly(text, MOBILE_LENGTH);
              useAuthStore.getState().setMobile(digits);
              // Dismiss once the number is complete, as the Flutter field did.
              if (digits.length === MOBILE_LENGTH) Keyboard.dismiss();
            }}
            keyboardType="number-pad"
            placeholder="12345 67890"
            placeholderTextColor={TextShade.c700}
            maxLength={11} // 10 digits + the group separator
          />
        </View>

        {showError ? (
          <Text style={styles.error}>
            {invalidMobile ? Strings.mobileValidation : errorMessage}
          </Text>
        ) : null}

        <Pressable
          onPress={onSubmit}
          disabled={isLoading}
          style={[styles.button, showError ? styles.buttonTight : styles.buttonLoose]}
        >
          <Text style={styles.buttonText}>{Strings.login}</Text>
        </Pressable>

        {/* Registration is its own button rather than something LOG IN falls
            into, because the two are different errands: one gets an approved
            driver in, the other starts the wait for approval. */}
        <View style={styles.divider} />
        <Text style={styles.registerHint}>{Strings.registerLoginHint}</Text>
        <Pressable
          onPress={onRegister}
          disabled={isLoading}
          style={styles.registerButton}
        >
          <Text style={styles.registerButtonText}>{Strings.registerCta}</Text>
        </Pressable>
        </View>
      </KeyboardAwareScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  // Fills the viewport at rest so the artwork block can push the sheet to the
  // bottom; grows taller and scrolls once the keyboard is up.
  scroll: { flexGrow: 1 },
  // Flexible spacer: `justifyContent: flex-end` keeps the artwork just above
  // the sheet rather than pinned to the top with a gap below it.
  topBlock: { flex: 1, justifyContent: 'flex-end', paddingTop: 20 },
  sheet: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    // Flutter's spreadRadius 8 / blur 13.1 shadow above the sheet.
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
  headerImage: { width: 110, height: 90, marginLeft: 15, resizeMode: 'contain' },
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
  error: {
    ...Typography.body2.regular,
    color: AppColors.error600,
    marginTop: 10,
  },
  button: {
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  buttonTight: { marginTop: 10 },
  buttonLoose: { marginTop: 15 },
  buttonText: { ...Typography.button2.extraBold, color: AppColors.white },
  // Separates "get me in" from "sign me up" so the two buttons do not read as
  // a pair of equal choices.
  divider: {
    height: 1,
    backgroundColor: TextShade.c200,
    marginTop: 20,
  },
  registerHint: {
    ...Typography.caption.regular,
    color: TextShade.c600,
    textAlign: 'center',
    marginTop: 16,
  },
  // Outlined, not filled: registering is the secondary errand on this screen.
  registerButton: {
    marginTop: 10,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: AppColors.primary,
    backgroundColor: AppColors.white,
  },
  registerButtonText: { ...Typography.button2.extraBold, color: AppColors.primary },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
