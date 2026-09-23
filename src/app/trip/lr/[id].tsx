/**
 * The Lorry Receipt, shown in the app.
 *
 * Android's WebView cannot display a PDF, so the receipt on screen is the LR's
 * own HTML — the same markup lr-pdf.ts prints to the file. What the driver
 * reads here and what they save are therefore the same document, built once in
 * lr-template.ts.
 *
 * Downloading never leaves this screen: the file is written to the driver's own
 * folder in place, so a driver who only wanted to look at the LR still has it
 * in front of them. The button only reads "again" once this visit has saved it,
 * so arriving to read the LR always offers a plain DOWNLOAD.
 */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { AppBar } from '@/components/app-bar';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { LrDownloadedDialog } from '@/features/trip/lr-downloaded-dialog';
import { downloadLrPdf, lrAssets } from '@/features/trip/lr-pdf';
import { buildLrHtml } from '@/features/trip/lr-template';
import { useTripDetailStore } from '@/features/trip/trip-detail-store';

export default function LrViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // `download=1` means the driver tapped DOWNLOAD rather than VIEW: show the
  // receipt as usual, and start saving it on arrival.
  const { download: autoDownload } = useLocalSearchParams<{
    id: string;
    download?: string;
  }>();

  const trip = useTripDetailStore((s) => s.tripDetailData);
  const [html, setHtml] = useState<string | null>(null);
  /** Set when the receipt could not be built, so the screen says so. */
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Whether this visit has saved the LR, which the confirmation line reflects.
  // Deliberately not a check for an existing file: opening an LR to read it
  // should say nothing about copies saved on some earlier visit.
  const [isSaved, setIsSaved] = useState(false);
  // How many saves have finished on this screen. The label turns to "again"
  // only from the second one, so the save that brought the driver here — the
  // card's DOWNLOAD — still leaves a plain DOWNLOAD behind it, exactly as
  // arriving through VIEW LR does.
  const [saveCount, setSaveCount] = useState(0);
  // Whether that save reached the shared Downloads folder, which is what the
  // confirmation can honestly point the driver at, and under what name.
  const [savedToDownloads, setSavedToDownloads] = useState(false);
  const [savedFileName, setSavedFileName] = useState('');
  const [showSavedDialog, setShowSavedDialog] = useState(false);
  /** Guards the save the card's DOWNLOAD asks for, so it runs once per visit. */
  const startedAutoDownload = useRef(false);

  // Expo Router keeps this screen mounted after the driver leaves it, so every
  // one of the flags above would still be set the next time they open the same
  // LR — the confirmation would reappear for a download they made minutes ago.
  // Each visit starts clean.
  const [visit, setVisit] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setIsSaved(false);
      setSaveCount(0);
      setShowSavedDialog(false);
      startedAutoDownload.current = false;
      // Re-keys the auto-download effect below, which would otherwise not run
      // again: neither the trip nor the route param changes between visits.
      setVisit((n) => n + 1);
    }, []),
  );

  useEffect(() => {
    let alive = true;
    setLoadFailed(false);
    void (async () => {
      if (!trip) return;
      try {
        const assets = await lrAssets();
        if (alive) setHtml(buildLrHtml(trip, assets));
      } catch (e) {
        // Without this the rejection is swallowed and `html` stays null, which
        // the render below cannot tell apart from "still building" — the
        // driver is left watching a spinner that will never finish.
        if (__DEV__) console.log('LR render failed', e);
        if (alive) setLoadFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [trip]);

  /**
   * `counts` is false for the save the driver started on the previous screen:
   * it is still their first download, so the button must not yet read "again".
   */
  const download = (counts = true) => {
    if (isSaving || !trip) return;
    void (async () => {
      setIsSaving(true);
      try {
        const { savedToDownloads, fileName } = await downloadLrPdf(trip);
        setSavedToDownloads(savedToDownloads);
        setSavedFileName(fileName);
        setIsSaved(true);
        if (counts) setSaveCount((n) => n + 1);
        setShowSavedDialog(true);
      } catch (e) {
        if (__DEV__) console.log('LR download failed', e);
        Alert.alert(Strings.lorryReceipt, Strings.lrDownloadFailed);
      } finally {
        setIsSaving(false);
      }
    })();
  };

  // Arrived from the card's DOWNLOAD: save once, as soon as the trip is in
  // hand. The guard is cleared on focus, so a later visit saves again rather
  // than silently doing nothing — and the receipt is on screen throughout.
  useEffect(() => {
    if (autoDownload !== '1' || !trip || startedAutoDownload.current) return;
    startedAutoDownload.current = true;
    download(false);
    // download() closes over the trip and the saving flag, both of which are
    // settled by the time this runs; re-running on their identity would only
    // repeat a save the guard above already prevents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownload, trip, visit]);

  return (
    <View style={styles.screen}>
      <AppBar
        title={trip?.lrNumber ?? Strings.lorryReceipt}
        leading="back"
        onLeadingPress={() => router.back()}
        variant="white"
        centerTitle
      />

      {loadFailed ? (
        <View style={styles.center}>
          <Text style={styles.failedText}>{Strings.lrRenderFailed}</Text>
        </View>
      ) : html == null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.web}
          // The document is a fixed-width sheet; let it scale down to fit and
          // stay pinchable rather than reflowing to the phone's width.
          scalesPageToFit
          setBuiltInZoomControls
          setDisplayZoomControls={false}
          showsHorizontalScrollIndicator={false}
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 15 }]}>
        {isSaved && (
          <View style={styles.savedRow}>
            <Ionicons name="checkmark-circle" size={20} color={AppColors.success500} />
            <Text style={styles.savedText}>
              {savedToDownloads ? Strings.lrSavedToDownloads : Strings.lrSavedOnPhone}
            </Text>
          </View>
        )}

        <Pressable
          onPress={() => download()}
          disabled={isSaving}
          style={[styles.button, isSaving && styles.buttonBusy]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={AppColors.white} />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color={AppColors.white} />
              <Text style={styles.buttonText}>
                {saveCount > 0 ? Strings.lrDownloadAgain : Strings.downloadLr}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <LrDownloadedDialog
        visible={showSavedDialog}
        savedToDownloads={savedToDownloads}
        fileName={savedFileName}
        onDismiss={() => setShowSavedDialog(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Primary.c100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  failedText: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  web: { flex: 1, backgroundColor: Primary.c100 },
  footer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    backgroundColor: AppColors.white,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  savedText: { ...Typography.body2.semiBold, color: TextShade.c700 },
  button: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: AppColors.primary,
  },
  buttonBusy: { opacity: 0.7 },
  buttonText: { ...Typography.button1.extraBold, color: AppColors.white },
});
