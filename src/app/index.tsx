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
  logo: { width: 250, height: 137, resizeMode: 'contain' },
});
