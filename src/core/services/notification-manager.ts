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

import {
  OFFER_CHANNEL_ID,
  RETIRED_CHANNEL_IDS,
} from '@/core/constants/notification-channels';
import { UserRepository } from './user-repository';

/** Matches the AndroidManifest channel the Flutter app declared. */
const CHANNEL_ID = 'high_importance_channel';
const CHANNEL_NAME = 'High Importance Notifications';

/**
 * Broadcast order offers get their own channel, separate from trip updates.
 *
 * Two reasons it cannot share the existing one. It needs the siren as its
 * sound, and an Android channel's sound is fixed at creation — changing it on
 * an existing channel is ignored by the OS forever after. And a driver who
 * mutes trip-update pings must not thereby mute the offers that pay them;
 * per-channel control is the only way Android lets them have both.
 *
 * The sound name is the res/raw resource created by the expo-notifications
 * config plugin from assets/sounds/new_order_siren.wav — hence no extension
 * handling here, and hence a prebuild being required after adding it.
 *
 * That file runs the full length of an offer window on purpose: Android plays
 * a notification sound through exactly once, so its duration IS how long the
 * phone rings for a driver whose app is closed.
 *
 * Underscores, not hyphens: an Android resource name must match
 * [a-z0-9_] and prebuild refuses the whole build over a hyphen.
 */

const OFFER_CHANNEL_NAME = 'New Order Offers';
const OFFER_SOUND = 'new_order_siren.wav';


/** `data.type` on a push, telling the app what the payload is. */
export const PushType = {
  jobOffer: 'job_offer',
  jobTaken: 'job_taken',
  jobCancelled: 'job_cancelled',
} as const;

/** Push types the dispatch layer owns, rather than the generic trip-update path. */
const DISPATCH_TYPES = new Set<string>([
  PushType.jobOffer,
  PushType.jobTaken,
  PushType.jobCancelled,
]);

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
  /** Creates the Android channels. No-op elsewhere. */
  async createChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: CHANNEL_NAME,
      description: 'High importance notifications for order updates',
      importance: Notifications.AndroidImportance.MAX,
      showBadge: true,
      enableVibrate: true,
    });

    // Drop superseded channels before creating the current one.
    for (const retired of RETIRED_CHANNEL_IDS) {
      try {
        await Notifications.deleteNotificationChannelAsync(retired);
      } catch {
        // Never created on this install, or already gone. Nothing to do.
      }
    }

    await Notifications.setNotificationChannelAsync(OFFER_CHANNEL_ID, {
      name: OFFER_CHANNEL_NAME,
      description: 'New orders offered to on-duty drivers',
      importance: Notifications.AndroidImportance.MAX,
      sound: OFFER_SOUND,
      showBadge: true,
      enableVibrate: true,
      // Matches the siren's beat, so a phone in a pocket buzzes in time with
      // the sound rather than against it.
      vibrationPattern: [0, 700, 500, 700, 500],
      // An offer expires in thirty seconds. Letting it wait behind Do Not
      // Disturb would mean the driver only ever sees expired work.
      bypassDnd: true,
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  },

  /** Where an offer notification is posted. Shared with the background handler. */
  offerChannelId: OFFER_CHANNEL_ID,

  /**
   * Runs for a push that arrives while the app is backgrounded or killed.
   *
   * There is no UI and no store here — the JS context is headless and dies as
   * soon as this resolves. The only job is to make the phone ring, so that the
   * driver opens the app; the offer itself is then picked up by the resync on
   * foreground.
   *
   * The server should send a `notification` block for offers, in which case FCM
   * has already displayed it and this does nothing. The local fallback exists
   * for data-only sends, where nothing would otherwise be shown at all.
   */
  async handleBackgroundMessage(
    message: FirebaseMessagingTypes.RemoteMessage,
  ): Promise<void> {
    const data = (message.data ?? {}) as Record<string, any>;
    if (data.type !== PushType.jobOffer) return;
    if (message.notification) return;

    // The channel is normally created at first launch, but a push can arrive
    // in a process that has never run the app's startup path. Creating it is
    // idempotent, and posting to a missing channel is silently dropped.
    await NotificationManager.createChannel();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: typeof data.title === 'string' ? data.title : 'New order available',
        body:
          typeof data.body === 'string'
            ? data.body
            : 'Open the app to accept it before another driver does.',
        data,
        sound: OFFER_SOUND,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      // A bare channel trigger delivers immediately on that channel, which is
      // what carries the siren sound and the DND bypass.
      trigger: { channelId: OFFER_CHANNEL_ID },
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
   * @param onDispatch fired for broadcast-dispatch pushes (offers and their
   *   outcomes), which bypass the generic path entirely — see below.
   *
   * Multiple callers may register; FCM supports several onMessage listeners,
   * so the dashboard and the dispatch layer each subscribe to what they need
   * instead of one of them routing for the other.
   */
  register(opts: {
    onForeground?: () => void;
    onOpen?: (tripId: string | null) => void;
    onDispatch?: (type: string, data: Record<string, any>) => void;
  }): () => void {
    const unsubscribeMessage = messaging().onMessage(async (message) => {
      if (__DEV__) console.log('FCM foreground:', message.notification?.title);

      const data = (message.data ?? {}) as Record<string, any>;
      const type = typeof data.type === 'string' ? data.type : undefined;

      if (type && DISPATCH_TYPES.has(type)) {
        // Deliberately no banner and no trip refetch. The overlay is already
        // taking the whole screen and the siren is already playing, so a
        // notification here would only stack a second sound on top of it.
        opts.onDispatch?.(type, data);
        return;
      }

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

    // FCM rotates tokens on its own — a reinstall, cleared app data, a restore
    // onto a new phone. This used to only log, which meant the server kept
    // pushing to a dead token and the driver silently stopped getting offers.
    const unsubscribeRefresh = messaging().onTokenRefresh(() => {
      if (__DEV__) console.log('FCM token refreshed; re-registering');
      void UserRepository.registerFcmToken();
    });

    return () => {
      unsubscribeMessage();
      unsubscribeOpened();
      unsubscribeRefresh();
    };
  },
} as const;

/**
 * Listens for the admin decision on a pending registration.
 *
 * Separate from register() above because that one is wired up by the
 * dashboard, and a driver waiting on approval never reaches the dashboard —
 * they are sitting on the waiting screen, or on login. The root layout
 * subscribes to this instead, so the decision lands whatever is on screen.
 *
 * Only the running app is covered here. A decision that arrives while the app
 * is closed needs no listener: the splash screen asks the server for the
 * current status on every launch, and the waiting screen asks again each time
 * the app returns to the front — both reach the same answer.
 */
export function onRegistrationDecision(
  handler: (status: string, reason?: string) => void,
): () => void {
  const isDecision = (m?: FirebaseMessagingTypes.RemoteMessage | null): boolean =>
    m?.data?.type === 'driver-registration';

  const read = (m: FirebaseMessagingTypes.RemoteMessage): void => {
    const reason = m.data?.rejectionReason;
    handler(String(m.data?.status ?? ''), reason ? String(reason) : undefined);
  };

  const unsubscribeMessage = messaging().onMessage(async (m) => {
    if (isDecision(m)) read(m);
  });
  const unsubscribeOpened = messaging().onNotificationOpenedApp((m) => {
    if (isDecision(m)) read(m);
  });

  return () => {
    unsubscribeMessage();
    unsubscribeOpened();
  };
}
