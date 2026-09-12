/**
 * The trip's Lorry Receipt: its number, and the way into it.
 *
 * A driver is asked for the LR at the pickup gate and on the road, so it sits
 * on the trip screen rather than behind a menu. VIEW LR opens it inside the
 * app; DOWNLOAD saves it to the phone (the app's own copy plus Downloads › BST
 * LR) without leaving this screen. Once saved, VIEW LR shows that copy, which
 * opens without a signal.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import type { LrDownloadResult } from '@/core/services/lr-file-store';
import { lrNativeAvailable } from '@/core/services/lr-native';
import { LrDownloadedDialog } from './lr-downloaded-dialog';
import { lrErrorMessage, useLrDocument } from './use-lr-document';

export function LrDocument({ tripId, lrNumber }: { tripId?: string; lrNumber?: string }) {
  const router = useRouter();
  const { downloadedPath, isDownloading, download } = useLrDocument(tripId, lrNumber);
  /** The download the success dialog is showing; null while it is closed. */
  const [downloaded, setDownloaded] = useState<LrDownloadResult | null>(null);

  // Nothing to show until the office (or the driver's accept) has issued one.
  if (!tripId || !lrNumber) return null;

  const openViewer = () =>
    router.push({ pathname: '/trip/lr/[id]', params: { id: tripId, lrNumber } });

  const onDownload = async () => {
    try {
      setDownloaded(await download());
    } catch (e) {
      Alert.alert(Strings.lrDownloadFailed, lrErrorMessage(e));
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="document-text-outline" size={22} color={AppColors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{Strings.lrDocumentTitle}</Text>
          <Text style={styles.number}>{lrNumber}</Text>
        </View>
      </View>

      {!lrNativeAvailable ? (
        // An install from before the viewer existed: say so, rather than crash
        // or send the driver out to a browser.
        <View style={styles.savedRow}>
          <Ionicons name="information-circle-outline" size={16} color={TextShade.c700} />
          <Text style={styles.savedText}>{Strings.lrNeedsAppUpdate}</Text>
        </View>
      ) : downloadedPath ? (
        <View style={styles.savedRow}>
          <Ionicons name="checkmark-circle" size={16} color={AppColors.success500} />
          <Text style={styles.savedText}>{Strings.lrSavedOnPhone}</Text>
        </View>
      ) : (
        <Text style={styles.hint}>{Strings.lrDocumentHint}</Text>
      )}

      {lrNativeAvailable && (
      <View style={styles.actions}>
        <LrButton
          label={Strings.viewLr}
          icon="eye-outline"
          variant="outline"
          disabled={isDownloading}
          onPress={openViewer}
        />
        <LrButton
          label={downloadedPath ? Strings.downloadAgainLr : Strings.downloadLr}
          icon="download-outline"
          variant="filled"
          // DOWNLOAD AGAIN is twice the length of VIEW LR and did not fit in
          // half the row, so it takes the wider share once the LR is saved.
          weight={downloadedPath ? 1.5 : 1}
          loading={isDownloading}
          disabled={isDownloading}
          onPress={() => void onDownload()}
        />
      </View>
      )}

      <LrDownloadedDialog
        visible={downloaded !== null}
        lrNumber={lrNumber}
        savedToDownloads={downloaded?.savedToDownloads ?? false}
        onClose={() => setDownloaded(null)}
        onOpen={() => {
          setDownloaded(null);
          openViewer();
        }}
      />
    </View>
  );
}

function LrButton({
  label,
  icon,
  variant,
  weight = 1,
  loading = false,
  disabled,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant: 'outline' | 'filled';
  /** Share of the row this button takes, relative to its neighbour. */
  weight?: number;
  loading?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const filled = variant === 'filled';
  const tint = filled ? AppColors.white : AppColors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { flex: weight },
        filled ? styles.buttonFilled : styles.buttonOutline,
        (pressed || (disabled && !loading)) && styles.buttonDimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : (
        <>
          <Ionicons name={icon} size={16} color={tint} />
          {/* Shrinks rather than clips on a narrow phone or a large system font. */}
          <Text
            style={[styles.buttonText, { color: tint }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
    padding: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, marginLeft: 10 },
  title: { ...Typography.body2.semiBold, color: TextShade.c700 },
  number: { ...Typography.subtitle2.extraBold, color: AppColors.text, marginTop: 2 },
  hint: { ...Typography.body2.regular, color: TextShade.c700, marginTop: 8 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  savedText: { ...Typography.body2.semiBold, color: TextShade.c700, flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: {
    height: 44,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: AppColors.primary,
    backgroundColor: AppColors.white,
  },
  buttonFilled: { backgroundColor: AppColors.primary },
  buttonDimmed: { opacity: 0.6 },
  buttonText: { ...Typography.button2.extraBold },
});
