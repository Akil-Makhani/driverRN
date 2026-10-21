/**
 * First-run language choice, between the splash and login.
 *
 * Shown once per install: the splash sends a phone here only while it has no
 * language of its own (hasChosenLanguage). After that the choice lives in
 * storage that logout does not clear, so a driver who logs out comes back to
 * login in the language they picked — whether here or later in the app.
 */
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageOptions } from '@/components/language-options';
import { Images } from '@/core/constants/assets';
import { PrimaryButton } from '@/core/constants/buttons';
import { AppColors, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { useLanguageStore } from '@/core/i18n/language';

export default function LanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const onContinue = () => {
    // Saved even when the driver keeps the default: tapping the language that
    // is already selected stores nothing, and without a stored value this
    // screen would come back on the next launch.
    const { language, setLanguage } = useLanguageStore.getState();
    setLanguage(language);
    router.replace('/(auth)/login');
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={Images.splashLogo} style={styles.logo} />
        <Text style={styles.title}>{Strings.chooseLanguageTitle}</Text>
        <Text style={styles.hint}>{Strings.chooseLanguageHint}</Text>
        <View style={styles.options}>
          <LanguageOptions />
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} style={PrimaryButton.shape}>
        <Text style={PrimaryButton.label}>{Strings.languageContinue}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white, paddingHorizontal: 20 },
  content: { flexGrow: 1 },
  // Same 801x234 wordmark and size as the splash, so the hand-off is seamless.
  logo: { width: 280, height: 82, resizeMode: 'contain', alignSelf: 'center' },
  title: { ...Typography.h4.bold, color: AppColors.text, marginTop: 48 },
  hint: { ...Typography.body2.regular, color: TextShade.c700, marginTop: 6 },
  options: { marginTop: 16 },
});
