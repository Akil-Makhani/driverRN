/**
 * LR PDFs kept on the phone.
 *
 * A download does two things. It keeps a copy in the app's own documents
 * folder, which is what the in-app viewer opens — so an LR the driver saved
 * still shows at a gate with no signal. And on Android it copies that file into
 * the shared Downloads collection (Downloads/BST LR), where the driver can find
 * it outside the app and forward it; Android 10+ allows that without any
 * storage permission.
 *
 * Files are named by LR number, which is unique, so downloading again replaces
 * the copy rather than piling up duplicates.
 */
import { Platform } from 'react-native';
import type ReactNativeBlobUtilType from 'react-native-blob-util';

import { lrNativeAvailable } from './lr-native';

/** Loaded on first use, never at import — see lr-native.ts. */
const blobUtil = (): typeof ReactNativeBlobUtilType => {
  if (!lrNativeAvailable) throw new Error('This app version cannot save LR files. Please update the app.');
  return require('react-native-blob-util').default;
};

const lrDir = (): string => `${blobUtil().fs.dirs.DocumentDir}/lr`;
/** The folder the driver sees under Downloads. */
export const LR_DOWNLOADS_FOLDER = 'BST LR';

const fileNameFor = (lrNumber: string): string =>
  `${lrNumber.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;

const localPathFor = (lrNumber: string): string => `${lrDir()}/${fileNameFor(lrNumber)}`;

/** Copies fetched only to be shown; the OS may clear them, and they never count as saved. */
const viewDir = (): string => `${blobUtil().fs.dirs.CacheDir}/lr-view`;

/** Fetches a PDF from `url` into `path`, creating its folder if needed. */
const fetchPdfTo = async (url: string, path: string): Promise<void> => {
  const ReactNativeBlobUtil = blobUtil();
  const dir = path.slice(0, path.lastIndexOf('/'));
  if (!(await ReactNativeBlobUtil.fs.isDir(dir))) {
    await ReactNativeBlobUtil.fs.mkdir(dir);
  }

  // Into a temporary name first, so a download that fails halfway never
  // replaces a good copy the driver already had.
  const partialPath = `${path}.part`;
  const response = await ReactNativeBlobUtil.config({ path: partialPath }).fetch('GET', url);
  const status = response.info().status;
  if (status < 200 || status >= 300) {
    await ReactNativeBlobUtil.fs.unlink(partialPath).catch(() => undefined);
    throw new Error(`Download failed (${status})`);
  }
  if (await ReactNativeBlobUtil.fs.exists(path)) {
    await ReactNativeBlobUtil.fs.unlink(path);
  }
  await ReactNativeBlobUtil.fs.mv(partialPath, path);
};

export interface LrDownloadResult {
  /** The app's own copy; what the viewer opens. */
  localPath: string;
  /** False where the shared Downloads copy could not be made (older Android, iOS). */
  savedToDownloads: boolean;
}

export const LrFileStore = {
  /** The saved copy of this LR, or null when it has not been downloaded here. */
  async findDownloaded(lrNumber?: string): Promise<string | null> {
    if (!lrNumber || !lrNativeAvailable) return null;
    try {
      const path = localPathFor(lrNumber);
      return (await blobUtil().fs.exists(path)) ? path : null;
    } catch {
      return null;
    }
  },

  /** Downloads the LR from a (short-lived) download link and keeps it. */
  async download(lrNumber: string, downloadUrl: string): Promise<LrDownloadResult> {
    const ReactNativeBlobUtil = blobUtil();
    const localPath = localPathFor(lrNumber);
    await fetchPdfTo(downloadUrl, localPath);

    let savedToDownloads = false;
    if (Platform.OS === 'android' && Number(Platform.Version) >= 29) {
      try {
        // The typings name the first field `path`; the native side reads `name`.
        await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
          {
            name: fileNameFor(lrNumber),
            parentFolder: LR_DOWNLOADS_FOLDER,
            mimeType: 'application/pdf',
          } as any,
          'Download',
          localPath,
        );
        savedToDownloads = true;
      } catch (e) {
        // The in-app copy is still there, which is what the viewer needs.
        if (__DEV__) console.log('copy LR to Downloads failed:', e);
      }
    }

    return { localPath, savedToDownloads };
  },

  /**
   * Fetches the LR only to show it: into the cache, not the saved copies, so
   * VIEW LR before DOWNLOAD leaves the LR undownloaded.
   *
   * The viewer opens this file rather than handing react-native-pdf the link.
   * That library's own network loader starts its download without waiting for
   * the unlink of its previous cache file, and that race is what made VIEW LR
   * fail until a copy had been downloaded. This is the fetch DOWNLOAD uses.
   */
  async fetchForViewing(lrNumber: string, url: string): Promise<string> {
    const path = `${viewDir()}/${fileNameFor(lrNumber)}`;
    await fetchPdfTo(url, path);
    return path;
  },
} as const;
