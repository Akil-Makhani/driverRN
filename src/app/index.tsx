/**
 * Port of lib/screens/splash/view/splash_screen.dart.
 *
 * Decides the entry route: a stored token that still resolves to a profile
 * goes to the dashboard, anything else to login. Notification permission is
 * requested here (as Flutter did in SplashViewModel.initializeFirebaseSetup)
 * rather than in the root layout, so the Android 13+ dialog appears reliably
 * after first paint.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { hasChosenLanguage } from '@/core/i18n/language';
import { AppColors, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import {
  NotificationManager,
  takePendingTrip,
} from '@/core/services/notification-manager';
import { UserRepository } from '@/core/services/user-repository';
import { useAuthStore } from '@/features/auth/auth-store';
import { useRegistrationStore } from '@/features/auth/registration-store';
import { useDashboardStore } from '@/features/dashboard/dashboard-store';

/** Login, by way of the language screen on a phone that has not picked one. */
function loginRoute() {
  return hasChosenLanguage() ? '/(auth)/login' : '/(auth)/language';
}

export default function SplashScreen() {
  const router = useRouter();
  // Strict mode double-invokes effects; without this the profile call and the
  // redirect would both run twice.
  const started = useRef(false);

  // Set when the server could not be reached: the message, in the driver's
  // language, with a button to try again, under the logo.
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const start = useCallback(async () => {
    const { ok, networkError: unreachable } =
      await useAuthStore.getState().loadStartupProfile();
    // A weak or missing connection used to land here as "not signed in" and
    // send a logged-in driver to the login screen. Say what is wrong instead,
    // and stay until it is fixed.
    if (unreachable) {
      setNetworkError(unreachable);
      return;
    }
    setNetworkError(null);

    if (!ok) {
      // No session. If a registration submitted from this device is still
      // waiting on the admin, that driver belongs back on the waiting screen
      // rather than at a login they cannot pass; a decision that arrived
      // while the app was closed comes back from this same check, and login
      // opens with the popup that announces it. Returns 'none' immediately
      // when this device has never registered, which is the common case.
      const pending = await useRegistrationStore.getState().checkPendingStatus();

      // Approved while the app was closed. The same trade the waiting screen
      // makes on OK works here, so a driver who was approved overnight opens
      // the app to the dashboard rather than to a login screen — and the
      // popup announcing it is dropped, because being inside the app says it
      // better than a message about being let in would.
      if (pending === 'Approved') {
        const mobile = useRegistrationStore.getState().pendingMobile ?? '';
        if (await useAuthStore.getState().claimApprovedSession(mobile)) {
          useDashboardStore.getState().syncDutyFromSession();
          const approvedTripId = takePendingTrip();
          router.replace('/dashboard');
          if (approvedTripId) router.push(`/trip/${approvedTripId}`);
          return;
        }
      }

      router.replace(
        pending === 'Pending' ? '/(auth)/pending-approval' : loginRoute(),
      );
      return;
    }

    // A valid token is not on its own a right to the dashboard: that is for
    // approved drivers only, and an account added by hand on the fleet
    // Drivers page can hold one without ever having been approved.
    // ensureApproved ends the session when it has to, and says where the
    // driver belongs instead: the waiting screen while a decision is out,
    // login otherwise — with the rejected popup it raised already in hand.
    const gate = await useAuthStore.getState().ensureApproved();
    if (gate !== 'approved') {
      router.replace(
        gate === 'pending' ? '/(auth)/pending-approval' : loginRoute(),
      );
      return;
    }

    /**
     * Tell the server this device's push token and notification channel on
     * every launch, not only when the duty switch flips.
     *
     * Both were previously written at login and on the duty transition, so a
     * driver who stayed logged in across an app update never reported the
     * new channel — and an update is exactly when the channel changes. The
     * server then pushed to a channel this install had already deleted, which
     * Android drops in silence. Re-registering is a no-op server-side when
     * nothing changed.
     */
    void UserRepository.registerFcmToken();

    // Seed the duty switch from the profile before the dashboard paints.
    useDashboardStore.getState().syncDutyFromSession();

    // A push tapped from a cold start routes straight to that trip.
    const tripId = takePendingTrip();
    router.replace('/dashboard');
    if (tripId) router.push(`/trip/${tripId}`);
  }, [router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      await NotificationManager.requestPermission();
      if (__DEV__) {
        console.log('FCM token:', await NotificationManager.getDeviceToken());
      }
      await start();
    })();
  }, [start]);

  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    await start();
    setRetrying(false);
  };

  return (
    <View style={styles.container}>
      <Image source={Images.splashLogo} style={styles.logo} />
      {networkError != null && (
        <View style={styles.network}>
          <MaterialCommunityIcons name="wifi-off" size={44} color={AppColors.error500} />
          <Text style={styles.networkTitle}>{Strings.networkStartupTitle}</Text>
          <Text style={styles.networkMessage}>{networkError}</Text>
          <Pressable
            onPress={() => void retry()}
            disabled={retrying}
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          >
            {retrying ? (
              <ActivityIndicator color={AppColors.white} />
            ) : (
              <Text style={styles.retryText}>{Strings.networkRetry}</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.white,
  },
  // 801x234 source: matching its 3.42:1 ratio keeps the wordmark at full size.
  // The Dart 250x137 box was taller than the art, so `contain` shrank it.
  logo: { width: 280, height: 82, resizeMode: 'contain' },
  network: { alignItems: 'center', marginTop: 40, paddingHorizontal: 32 },
  networkTitle: {
    ...Typography.h4.extraBold,
    color: AppColors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  networkMessage: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    height: 50,
    minWidth: 200,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { ...Typography.button2.extraBold, color: AppColors.white },
  pressed: { opacity: 0.8 },
});
