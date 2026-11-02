/**
 * Forced updates: a phone running an older build than the one on the store
 * may not keep using the app.
 *
 * "Older" is decided by the store itself — Google Play's in-app update API on
 * Android, the App Store lookup on iOS — so publishing a release is all it
 * takes; there is no minimum version to remember to raise anywhere. Play
 * learns of a release on its own schedule, so a phone may take a few hours
 * after publishing to start asking.
 *
 * Nothing is lost by updating. Tokens, the language and the tracking state
 * are in MMKV, which an in-place update keeps, and trips live on the server:
 * after the update the splash restores the session, the dashboard reloads the
 * trips, and LocationTracker.sync restarts tracking for one in progress.
 */
import * as Application from 'expo-application';
import * as InAppUpdates from 'expo-in-app-updates';
import { Linking, Platform } from 'react-native';

/**
 * Whether the store holds a newer build than this one.
 *
 * Fails open: an offline phone, a build not installed from the store (debug,
 * sideloaded, emulator), or a Play that cannot be reached all answer false,
 * because a driver mid-delivery locked out by a network blip is worse than
 * one more trip on the old version.
 */
export async function isUpdateRequired(): Promise<boolean> {
  // Debug builds come from Metro, never the store, so there is nothing to
  // compare them with.
  if (__DEV__ || Platform.OS === 'web') return false;
  try {
    const { updateAvailable } = await InAppUpdates.checkForUpdate();
    return updateAvailable === true;
  } catch (e) {
    if (__DEV__) console.log('checkForUpdate failed:', e);
    return false;
  }
}

/**
 * Starts the update. On Android that is Play's full-screen immediate flow,
 * which downloads, installs and relaunches the app. When Play will not run it
 * (an update already half done, immediate not allowed, Play unavailable) the
 * store page opens instead, so the button always leads somewhere.
 */
export async function startRequiredUpdate(): Promise<void> {
  let started = false;
  try {
    started = await InAppUpdates.startUpdate(true);
  } catch (e) {
    if (__DEV__) console.log('startUpdate failed:', e);
  }
  if (started || Platform.OS !== 'android') return;

  const id = Application.applicationId;
  try {
    await Linking.openURL(`market://details?id=${id}`);
  } catch {
    await Linking.openURL(`https://play.google.com/store/apps/details?id=${id}`);
  }
}
