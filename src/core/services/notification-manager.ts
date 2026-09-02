/**
 * Port of lib/utility/notification_manager.dart.
 *
 * Flutter combined firebase_messaging with flutter_local_notifications to
 * re-present foreground pushes. expo-notifications covers both here: FCM
 * delivers the message, and a notification handler decides how a foreground
 * one is shown, so there is no second plugin and no manual channel juggling
 * on the display path.
 *
 * `pendingNotification` replaces the Dart global of the same name: a push tap
 * that arrives before the tree can navigate is parked here and consumed by the
 * splash screen once routing is possible.
 */
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Matches the AndroidManifest channel the Flutter app declared. */
const CHANNEL_ID = 'high_importance_channel';
const CHANNEL_NAME = 'High Importance Notifications';

/** A tapped push waiting for the router to be ready. Consume with `takePendingTrip`. */
let pendingTripId: string | null = null;

export function setPendingTrip(tripId: string | null): void {
  pendingTripId = tripId;
}

/** Returns the parked trip id and clears it, so it is only navigated to once. */
export function takePendingTrip(): string | null {
  const id = pendingTripId;
  pendingTripId = null;
  return id;
}

const tripIdOf = (m?: FirebaseMessagingTypes.RemoteMessage | null): string | null =>
  (m?.data?.tripId as string | undefined) ?? null;

// Foreground pushes are shown as banners, matching the Flutter behaviour of
// re-presenting them via flutter_local_notifications.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NotificationManager = {
  /** Creates the Android channel. No-op elsewhere. */
  async createChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: CHANNEL_NAME,
      description: 'High importance notifications for order updates',
      importance: Notifications.AndroidImportance.MAX,
      showBadge: true,
      enableVibrate: true,
    });
  },

  /**
   * Requests permission. Unlike the Dart version this does NOT bounce the
   * driver to system settings on refusal — being thrown out of the app at
   * first launch is hostile, and the app works without notifications.
   */
  async requestPermission(): Promise<boolean> {
    await NotificationManager.createChannel();

    // Android 13+ gates notifications behind the POST_NOTIFICATIONS runtime
    // permission. messaging().requestPermission() is Firebase's iOS API and
    // does not raise that dialog, so the prompt never appeared and the
    // permission stayed denied. expo-notifications asks the OS correctly on
    // both platforms.
    if (Platform.OS === 'android') {
      const existing = await Notifications.getPermissionsAsync();
      if (existing.granted) return true;
      if (!existing.canAskAgain) return false;
      const requested = await Notifications.requestPermissionsAsync();
      return requested.granted;
    }

    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  },

  async getDeviceToken(): Promise<string> {
    try {
      return await messaging().getToken();
    } catch (e) {
      if (__DEV__) console.log('Error retrieving device token:', e);
      return '';
    }
  },

  /**
   * Wires the three delivery paths. Returns an unsubscribe for the two
   * listeners; the quit-state message is read once.
   *
   * @param onForeground fired for a push received while the app is open, so
   *   the dashboard can refetch (replaces dashboardRefreshNotifier).
   * @param onOpen fired when a push is tapped, with the trip id if it has one.
   */
  register(opts: {
    onForeground?: () => void;
    onOpen?: (tripId: string | null) => void;
  }): () => void {
    const unsubscribeMessage = messaging().onMessage(async (message) => {
      if (__DEV__) console.log('FCM foreground:', message.notification?.title);
      opts.onForeground?.();
      // FCM does not raise a system notification for a foreground message, so
      // present one locally to match the Flutter app.
      const { title, body } = message.notification ?? {};
      if (title || body) {
        await Notifications.scheduleNotificationAsync({
          content: { title: title ?? '', body: body ?? '', data: message.data ?? {} },
          trigger: null,
        });
      }
    });

    const unsubscribeOpened = messaging().onNotificationOpenedApp((message) => {
      opts.onOpen?.(tripIdOf(message));
    });

    // Cold start from a tapped push.
    void messaging()
      .getInitialNotification()
      .then((message) => {
        if (message) setPendingTrip(tripIdOf(message));
      });

    const unsubscribeRefresh = messaging().onTokenRefresh(() => {
      if (__DEV__) console.log('FCM token refreshed');
    });

    return () => {
      unsubscribeMessage();
      unsubscribeOpened();
      unsubscribeRefresh();
    };
  },
} as const;
