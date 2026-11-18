/**
 * Forced updates: a phone running an older build than the one on the store
 * may not keep using the app.
 *
 * "Older" is decided two ways: the minimum build the admin sets in Tempo App
 * Setting (reaches every phone at once, on any network), and the store itself
 * - Google Play's in-app update API on Android, the App Store lookup on iOS -
 * which learns of a release on its own schedule, often hours later and not
 * the same on every phone.
 *
 * Nothing is lost by updating. Tokens, the language and the tracking state
 * are in MMKV, which an in-place update keeps, and trips live on the server:
 * after the update the splash restores the session, the dashboard reloads the
 * trips, and LocationTracker.sync restarts tracking for one in progress.
 */
import * as Application from 'expo-application';
import * as InAppUpdates from 'expo-in-app-updates';
import { Linking, Platform } from 'react-native';

import { ApiService } from '@/core/api/api-service';
import { ApiUrls } from '@/core/api/endpoints';

/**
 * The oldest build the office still allows, from bst-api (the admin's Tempo
 * App Setting > Force app update). 0 when none is set or the server cannot be
 * reached. Asked fresh every time - no cache - so a new minimum reaches a
 * phone the next time the app opens or comes back to the screen, whatever
 * network it is on.
 */
async function serverMinBuild(): Promise<number> {
  const appId = Application.applicationId;
  if (!appId) return 0;
  try {
    const raw = await ApiService.get(
      `${ApiUrls.appVersion}?appId=${encodeURIComponent(appId)}&platform=${Platform.OS}&t=${Date.now()}`,
    );
    const min = Number(raw?.data?.minBuild);
    return Number.isFinite(min) && min > 0 ? min : 0;
  } catch {
    return 0;
  }
}

/** This install's build number: Android versionCode, iOS build. */
function ownBuild(): number {
  const build = Number(Application.nativeBuildVersion);
  return Number.isFinite(build) ? build : 0;
}

/** Google Play / the App Store says a newer build is out. */
async function storeHasUpdate(): Promise<boolean> {
  try {
    const { updateAvailable } = await InAppUpdates.checkForUpdate();
    return updateAvailable === true;
  } catch (e) {
    if (__DEV__) console.log('checkForUpdate failed:', e);
    return false;
  }
}

/**
 * Whether this build may no longer be used.
 *
 * Two sources, either one is enough:
 *  - the office's minimum build (bst-api). This is what makes a release reach
 *    every phone at once: Play's in-app update API answers from a copy each
 *    phone refreshes on its own schedule, so one phone saw a release at once
 *    on mobile data while another on office Wi-Fi went on opening the old app
 *    until it was restarted on mobile data.
 *  - Play / the App Store itself, for a release the admin has not entered.
 *
 * Fails open: an offline phone, a build not installed from the store (debug,
 * sideloaded, emulator), or a store that cannot be reached all answer false,
 * because a driver mid-delivery locked out by a network blip is worse than
 * one more trip on the old version.
 */
export async function isUpdateRequired(): Promise<boolean> {
  // Debug builds come from Metro, never the store, so there is nothing to
  // compare them with.
  if (__DEV__ || Platform.OS === 'web') return false;
  const [min, store] = await Promise.all([serverMinBuild(), storeHasUpdate()]);
  return (min > 0 && ownBuild() > 0 && ownBuild() < min) || store;
}

/**
 * Starts the update. On Android this opens the app's Play Store page, where
 * Update starts straight away: the store page reads the release fresh, while
 * Play's in-app flow works from the phone's cached copy - it could say there
 * was nothing to install, or sit on a slow full-screen download. The in-app
 * flow is the fallback for a phone with no Play Store app to open.
 */
export async function startRequiredUpdate(): Promise<void> {
  if (Platform.OS === 'android') {
    const id = Application.applicationId;
    try {
      await Linking.openURL(`market://details?id=${id}`);
      return;
    } catch {
      // No Play Store app: try Play's own flow, then the website.
    }
    try {
      if (await InAppUpdates.startUpdate(true)) return;
    } catch (e) {
      if (__DEV__) console.log('startUpdate failed:', e);
    }
    await Linking.openURL(`https://play.google.com/store/apps/details?id=${id}`);
    return;
  }
  try {
    await InAppUpdates.startUpdate(true);
  } catch (e) {
    if (__DEV__) console.log('startUpdate failed:', e);
  }
}
