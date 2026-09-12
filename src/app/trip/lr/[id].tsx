/**
 * The LR, opened inside the app.
 *
 * Shows the copy saved on this phone when there is one — it opens instantly
 * and needs no signal — and otherwise fetches the office's copy into the cache
 * just to show it, which does not count as downloading. Downloading from here
 * saves it for next time and switches the view over to that saved copy.
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type PdfType from 'react-native-pdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/app-bar';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { DashboardRepository } from '@/core/services/dashboard-repository';
import { type LrDownloadResult, LrFileStore } from '@/core/services/lr-file-store';
import { lrNativeAvailable } from '@/core/services/lr-native';
import { LrDownloadedDialog } from '@/features/trip/lr-downloaded-dialog';
import { lrErrorMessage, useLrDocument } from '@/features/trip/use-lr-document';

/** Required only in a build that has it; see lr-native.ts. */
const Pdf: typeof PdfType | null = lrNativeAvailable ? require('react-native-pdf').default : null;

export default function LrViewerScreen() {
  const router = useRouter();

  // A build without the viewer never mounts the screen below, which would
  // import nothing but still try to fetch and draw a PDF it cannot show.
  if (!Pdf) {
    return (
      <View style={styles.screen}>
        <AppBar title={Strings.lrDocumentTitle} leading="back" onLeadingPress={() => router.back()} />
        <View style={[styles.body, styles.overlay]}>
          <Ionicons name="cloud-download-outline" size={48} color={Primary.c500} />
          <Text style={styles.errorText}>{Strings.lrNeedsAppUpdate}</Text>
        </View>
      </View>
    );
  }
  return <LrViewer Pdf={Pdf} />;
}

function LrViewer({ Pdf }: { Pdf: typeof PdfType }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, lrNumber } = useLocalSearchParams<{ id: string; lrNumber: string }>();
  const { downloadedPath, isChecking, isDownloading, download } = useLrDocument(id, lrNumber);

  /** The cached copy fetched just to show, when nothing is saved on the phone. */
  const [viewPath, setViewPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  /** Bumped by TRY AGAIN, to re-run the fetch below. */
  const [attempt, setAttempt] = useState(0);
  /** The download the success dialog is showing; null while it is closed. */
  const [downloaded, setDownloaded] = useState<LrDownloadResult | null>(null);

  // Only reach for the network when there is no saved copy to show. The PDF is
  // fetched to a file here rather than passed to the viewer as a link; see
  // LrFileStore.fetchForViewing for why.
  useEffect(() => {
    if (isChecking || downloadedPath || viewPath || !id) return;
    let active = true;
    setError(null);
    DashboardRepository.getTripLr(id)
      .then((links) => {
        const url = links.viewUrl || links.downloadUrl;
        if (!url) throw new Error(Strings.somethingWentWrong);
        return LrFileStore.fetchForViewing(lrNumber || id, url);
      })
      .then((path) => {
        if (active) setViewPath(path);
      })
      .catch((e) => {
        if (active) setError(lrErrorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [isChecking, downloadedPath, viewPath, id, lrNumber, attempt]);

  const shownPath = downloadedPath ?? viewPath;
  const sourceUri = shownPath ? `file://${shownPath}` : null;

  const onDownload = async () => {
    try {
      const previousPath = downloadedPath;
      const result = await download();
      // A first download swaps the viewer onto the saved copy, which reloads it.
      // Downloading again rewrites the same file under the same key, so the
      // viewer stays as it is and must not be put back into its loading state.
      if (result.localPath !== previousPath) setIsLoaded(false);
      setDownloaded(result);
    } catch (e) {
      Alert.alert(Strings.lrDownloadFailed, lrErrorMessage(e));
    }
  };

  const retry = () => {
    setError(null);
    setIsLoaded(false);
    setViewPath(null);
    setAttempt((n) => n + 1);
  };

  return (
    <View style={styles.screen}>
      <AppBar
        title={lrNumber ?? Strings.lrDocumentTitle}
        leading="back"
        onLeadingPress={() => router.back()}
      />

      <View style={styles.body}>
        {sourceUri && !error && (
          <Pdf
            // A new source (remote -> saved copy) must mount a fresh viewer.
            key={sourceUri}
            source={{ uri: sourceUri, cache: false }}
            style={styles.pdf}
            fitPolicy={0}
            onLoadComplete={() => setIsLoaded(true)}
            onError={(e) => {
              if (__DEV__) console.log('LR pdf error:', e);
              setError(Strings.lrOpenFailed);
            }}
          />
        )}

        {!error && !isLoaded && (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator size="large" color={AppColors.primary} />
            <Text style={styles.overlayText}>{Strings.lrLoading}</Text>
          </View>
        )}

        {error && (
          <View style={styles.overlay}>
            <Ionicons name="document-text-outline" size={48} color={Primary.c500} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={retry} style={[styles.button, styles.buttonOutline]}>
              <Text style={[styles.buttonText, { color: AppColors.primary }]}>{Strings.lrRetry}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        {downloadedPath && (
          <View style={styles.savedRow}>
            <Ionicons name="checkmark-circle" size={16} color={AppColors.success500} />
            <Text style={styles.savedText}>{Strings.lrViewingSaved}</Text>
          </View>
        )}
        <Pressable
          onPress={() => void onDownload()}
          disabled={isDownloading}
          style={({ pressed }) => [
            styles.button,
            styles.buttonFilled,
            (pressed || isDownloading) && styles.buttonDimmed,
          ]}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={AppColors.white} />
          ) : (
            <>
              <Ionicons name="download-outline" size={18} color={AppColors.white} />
              <Text style={[styles.buttonText, { color: AppColors.white }]}>
                {downloadedPath ? Strings.downloadAgainLr : Strings.downloadLr}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* No OPEN here: the LR is already on screen. */}
      <LrDownloadedDialog
        visible={downloaded !== null}
        lrNumber={lrNumber}
        savedToDownloads={downloaded?.savedToDownloads ?? false}
        onClose={() => setDownloaded(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  body: { flex: 1, backgroundColor: Primary.c100 },
  pdf: { flex: 1, backgroundColor: Primary.c100 },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    gap: 12,
  },
  overlayText: { ...Typography.body2.semiBold, color: TextShade.c700 },
  errorText: { ...Typography.body1.semiBold, color: AppColors.text, textAlign: 'center' },
  footer: {
    paddingHorizontal: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Primary.c200,
    backgroundColor: AppColors.white,
    gap: 8,
  },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedText: { ...Typography.body2.semiBold, color: TextShade.c700 },
  button: {
    height: 46,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: AppColors.primary,
    backgroundColor: AppColors.white,
  },
  buttonFilled: { backgroundColor: AppColors.primary, alignSelf: 'stretch' },
  buttonDimmed: { opacity: 0.6 },
  buttonText: { ...Typography.button2.extraBold },
});
