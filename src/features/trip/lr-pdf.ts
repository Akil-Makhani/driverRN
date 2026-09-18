/**
 * Builds the Lorry Receipt PDF on the device.
 *
 * The office's web app generates the same document and stores it on S3, but the
 * driver app never receives that file, so it renders its own from the trip data
 * it already holds. See lr-template.ts for how faithfully the markup tracks the
 * web original.
 */
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

import { Preference } from '@/core/storage/preference';
import type { TripDetailsData } from '@/types/trip';
import { buildLrHtml, PAGE_HEIGHT, PAGE_WIDTH } from './lr-template';

const LOGO = require('../../../assets/images/lr-company-logo.png');
const SIGNATURE = require('../../../assets/images/lr-signature.png');

/**
 * Bundled images as `data:` URIs. The print WebView runs outside the app's
 * asset scope, so a bundle path in an <img src> resolves to nothing — the
 * bytes have to travel inside the HTML.
 *
 * Both images are fixed assets, so the encoded strings are cached after the
 * first LR and every later one reuses them.
 */
let assetCache: { logo: string; signature: string } | null = null;

async function encodeAsset(moduleRef: number): Promise<string> {
  const [asset] = await Asset.loadAsync(moduleRef);
  if (!asset.localUri) throw new Error('LR asset has no local URI');
  const base64 = await new File(asset.localUri).base64();
  return `data:image/png;base64,${base64}`;
}

/** Shared with the in-app viewer, which renders the same HTML. */
export async function lrAssets() {
  if (assetCache) return assetCache;
  const [logo, signature] = await Promise.all([
    encodeAsset(LOGO),
    encodeAsset(SIGNATURE),
  ]);
  assetCache = { logo, signature };
  return assetCache;
}

/** The filename a driver will see, matching the web app's `<lrNumber>.pdf`. */
export function lrFileName(lrNumber?: string): string {
  const base = (lrNumber ?? '').trim().replace(/[^\w.-]+/g, '-');
  return `${base || 'lorry-receipt'}.pdf`;
}

/**
 * Where this LR's copy lives on the phone. `.exists` on the returned handle
 * tells the viewer whether to offer a download or a re-download.
 */
export function savedLrFile(lrNumber?: string): File {
  return new File(Paths.document, lrFileName(lrNumber));
}

/**
 * Renders the trip's LR and returns a file URI. The PDF lands in the document
 * directory under its LR number, replacing any earlier copy of the same LR so
 * repeat taps do not pile up numbered duplicates.
 */
export async function generateLrPdf(trip: TripDetailsData): Promise<string> {
  const html = buildLrHtml(trip, await lrAssets());

  // Android ignores these and takes the page size from the document's own
  // @page rule; they are passed for iOS, which does honour them. Both read the
  // same constants, so the two paths cannot drift.
  const { uri } = await Print.printToFileAsync({
    html,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    base64: false,
  });

  // printToFileAsync names the file with a random UUID in the cache directory.
  // Move it somewhere stable so the file keeps a meaningful name.
  const target = savedLrFile(trip.lrNumber);
  if (target.exists) target.delete();
  await new File(uri).move(target);
  return target.uri;
}

/** The folder the driver sees under Downloads. */
export const LR_DOWNLOADS_FOLDER = 'BST LR';

/** MediaStore's Downloads collection arrived in Android 10. */
const ANDROID_10 = 29;

/** What a save attempt did, so the caller can tell the driver. */
export interface SaveOutcome {
  fileName: string;
  /**
   * False where the shared Downloads copy could not be made — iOS, or an
   * Android older than 10. The app's own copy is written either way.
   */
  savedToDownloads: boolean;
}

/**
 * Renders the LR and saves it where the driver keeps their files.
 *
 * On Android the file is copied into the shared Downloads collection
 * (Downloads/BST LR) through MediaStore, which Android 10+ allows with no
 * storage permission and no dialog — one tap and the PDF is there, findable
 * from any file manager and forwardable from any app. Writing into Downloads
 * any other way is blocked: the folder picker refuses that folder outright,
 * and a file the Save dialog creates is not writable through expo-file-system.
 *
 * iOS needs none of this — the app's Documents folder IS what the Files app
 * shows, so the copy generateLrPdf already wrote is the saved file.
 */
export async function downloadLrPdf(trip: TripDetailsData): Promise<SaveOutcome> {
  const localUri = await generateLrPdf(trip);
  const fileName = lrFileName(trip.lrNumber);

  if (Platform.OS !== 'android' || Number(Platform.Version) < ANDROID_10) {
    return { fileName, savedToDownloads: false };
  }

  // MediaCollection takes a plain path, not a file:// URI.
  const localPath = localUri.replace(/^file:\/\//, '');

  try {
    // MediaStore never overwrites by name: copying the same filename again
    // yields "LR-0152 (1).pdf". Downloading an LR twice should leave the
    // driver with one current copy, not a numbered pile, so a second download
    // writes over the entry the first one created. If that entry is gone —
    // the driver deleted it, or cleared the app's data — fall through and make
    // a fresh one.
    const existing = Preference.getLrMediaUri(fileName);
    if (existing) {
      try {
        await ReactNativeBlobUtil.MediaCollection.writeToMediafile(existing, localPath);
        return { fileName, savedToDownloads: true };
      } catch {
        Preference.clearLrMediaUri(fileName);
      }
    }

    // The typings name the first field `path`; the native side reads `name`.
    const uri = await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
      {
        name: fileName,
        parentFolder: LR_DOWNLOADS_FOLDER,
        mimeType: 'application/pdf',
      } as any,
      'Download',
      localPath,
    );
    Preference.saveLrMediaUri(fileName, uri);
    return { fileName, savedToDownloads: true };
  } catch (e) {
    // The in-app copy is still there, so the LR is not lost — only the shared
    // one failed, and the caller says so rather than claiming a save.
    if (__DEV__) console.log('copy LR to Downloads failed:', e);
    return { fileName, savedToDownloads: false };
  }
}
