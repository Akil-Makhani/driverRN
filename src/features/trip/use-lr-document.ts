/**
 * A trip's LR as far as this phone is concerned: whether a copy is saved here,
 * and downloading one. Shared by the trip screen's LR card and the LR viewer,
 * so a download started in either shows up in the other.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { AppException } from '@/core/api/errors';
import { Strings } from '@/core/constants/strings';
import { DashboardRepository } from '@/core/services/dashboard-repository';
import { type LrDownloadResult, LrFileStore } from '@/core/services/lr-file-store';

/** The server's own words when it sent some ("No LR has been issued…"). */
export const lrErrorMessage = (e: unknown): string =>
  e instanceof AppException && e.message.length > e.prefix.length
    ? e.message.slice(e.prefix.length)
    : Strings.somethingWentWrong;

export function useLrDocument(tripId?: string, lrNumber?: string) {
  const [downloadedPath, setDownloadedPath] = useState<string | null>(null);
  /** True until the first look for a saved copy has answered. */
  const [isChecking, setIsChecking] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  // Re-checked whenever the screen comes back into view: the other screen may
  // have saved (or replaced) the copy in the meantime.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void LrFileStore.findDownloaded(lrNumber).then((path) => {
        if (!active) return;
        setDownloadedPath(path);
        setIsChecking(false);
      });
      return () => {
        active = false;
      };
    }, [lrNumber]),
  );

  /**
   * Fetches fresh links (they expire within the hour) and saves the PDF.
   * Throws for the caller to show; the message is the server's where it sent one.
   */
  const download = useCallback(async (): Promise<LrDownloadResult> => {
    if (!tripId || !lrNumber) throw new Error(Strings.somethingWentWrong);
    setIsDownloading(true);
    try {
      const links = await DashboardRepository.getTripLr(tripId);
      if (!links.downloadUrl) throw new Error(Strings.somethingWentWrong);
      const result = await LrFileStore.download(lrNumber, links.downloadUrl);
      setDownloadedPath(result.localPath);
      return result;
    } finally {
      setIsDownloading(false);
    }
  }, [tripId, lrNumber]);

  return { downloadedPath, isChecking, isDownloading, download };
}
