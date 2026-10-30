/**
 * The privacy policy, shown inside the app rather than handed to Chrome —
 * a WebView screen like TempoRN's terms and privacy pages. Play requires the
 * policy to be reachable from inside the app.
 *
 * The page is the app's own copy in the driver's language (core/legal), not
 * the website, whose copy is English only. It also opens with no network.
 */
import { useRouter } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { AppBar } from '@/components/app-bar';
import { AppColors, Primary } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { useLanguageStore } from '@/core/i18n/language';
import { privacyPolicyHtml } from '@/core/legal/privacy-policy';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  // The app draws edge to edge, so the phone's navigation bar sits over the
  // bottom of the screen; keep the page's last lines and footer above it.
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <AppBar
        title={Strings.sideBarPrivacyPolicy}
        leading="back"
        onLeadingPress={() =>
          router.canGoBack() ? router.back() : router.replace('/dashboard')
        }
        variant="white"
      />

      <View style={[styles.card, { marginBottom: 16 + insets.bottom }]}>
        <WebView
          source={{ html: privacyPolicyHtml(language) }}
          originWhitelist={['*']}
          // The page itself loads as about:blank; anything else is a link the
          // driver tapped — email, phone, the customer policy — and belongs in
          // the app that handles it, not inside this frame.
          onShouldStartLoadWithRequest={({ url }) => {
            if (url.startsWith('about:')) return true;
            void Linking.openURL(url).catch(() => {});
            return false;
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  // Bordered, padded container around the page, as in TempoRN.
  card: {
    flex: 1,
    margin: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: AppColors.white,
    overflow: 'hidden',
  },
});
