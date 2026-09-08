/**
 * Port of lib/screens/splash/view/splash_screen.dart.
 *
 * Decides the entry route: a stored token that still resolves to a profile
 * goes to the dashboard, anything else to login. Notification permission is
 * requested here (as Flutter did in SplashViewModel.initializeFirebaseSetup)
 * rather than in the root layout, so the Android 13+ dialog appears reliably
 * after first paint.
 */
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { AppColors } from '@/core/constants/colors';
import {
  NotificationManager,
  takePendingTrip,
} from '@/core/services/notification-manager';
import { useAuthStore } from '@/features/auth/auth-store';
import { useRegistrationStore } from '@/features/auth/registration-store';
import { useDashboardStore } from '@/features/dashboard/dashboard-store';

export default function SplashScreen() {
  const router = useRouter();
  // Strict mode double-invokes effects; without this the profile call and the
  // redirect would both run twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      await NotificationManager.requestPermission();
      if (__DEV__) {
        console.log('FCM token:', await NotificationManager.getDeviceToken());
      }

      const ok = await useAuthStore.getState().loadProfile();
      if (!ok) {
        // No session. If a registration submitted from this device is still
        // waiting on the admin, ask what was decided so login can open with
        // the answer already in hand. Returns immediately when this device
        // has never registered, which is the common case.
        await useRegistrationStore.getState().checkPendingStatus();
        router.replace('/(auth)/login');
        return;
      }

      // A valid token is not on its own a right to the dashboard: that is for
      // approved drivers only, and an account added by hand on the fleet
      // Drivers page can hold one without ever having been approved.
      // ensureApproved ends the session and raises the waiting or rejected
      // popup when it has to, so login opens with the answer already in hand.
      if (!(await useAuthStore.getState().ensureApproved())) {
        router.replace('/(auth)/login');
        return;
      }

      // Seed the duty switch from the profile before the dashboard paints.
      useDashboardStore.getState().syncDutyFromSession();

      // A push tapped from a cold start routes straight to that trip.
      const tripId = takePendingTrip();
      router.replace('/dashboard');
      if (tripId) router.push(`/trip/${tripId}`);
    })();
  }, [router]);

  return (
    <View style={styles.container}>
      <Image source={Images.splashLogo} style={styles.logo} />
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
});
