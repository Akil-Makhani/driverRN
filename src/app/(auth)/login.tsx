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

    if (await useAuthStore.getState().sendOTP()) {
      useAuthStore.getState().resetOtp();
      useAuthStore.getState().startTimer();
      router.push({ pathname: '/(auth)/otp', params: { mobile } });
    }
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
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
