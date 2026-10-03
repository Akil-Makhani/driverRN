/**
 * Whether this install can show and save LR PDFs itself.
 *
 * The viewer (react-native-pdf) and the downloader (react-native-blob-util,
 * which the viewer also imports) are native code, so they exist only in builds
 * made after they were added. A JS bundle is not tied to a build — an older
 * APK can load today's code from Metro, or an update can outrun an install —
 * and importing either library there throws at module load ("Cannot read
 * property 'getConstants' of null"), taking the whole trip screen with it.
 *
 * So they are required lazily, and only when this is true. The two ship
 * together, so the downloader's module answers for both.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';
import { TurboModuleRegistry } from 'react-native';

/**
 * Sharing the PDF to WhatsApp, mail and the like (expo-sharing) came in a later
 * build than the viewer, so an APK with the viewer may still lack it. The SHARE
 * button is shown only when this is true.
 */
export const lrShareAvailable: boolean = (() => {
  try {
    return requireOptionalNativeModule('ExpoSharing') != null;
  } catch {
    return false;
  }
})();

export const lrNativeAvailable: boolean = (() => {
  try {
    return TurboModuleRegistry.get('ReactNativeBlobUtil') != null;
  } catch {
    return false;
  }
})();
