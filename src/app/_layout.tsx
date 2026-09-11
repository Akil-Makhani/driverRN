import messaging from '@react-native-firebase/messaging';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Dispatch } from '@/core/realtime/dispatch';
import {
  NotificationManager,
  onRegistrationDecision,
} from '@/core/services/notification-manager';
import { useAppFonts } from '@/core/theme/use-app-fonts';
import { RegistrationOutcomeHost } from '@/features/auth/registration-outcome-host';
import { useRegistrationStore } from '@/features/auth/registration-store';
import { JobOfferOverlay } from '@/features/job/job-offer-overlay';

// Registering the background location task is a side effect of importing the
// tracker, and it has to happen before the OS can hand the task back to us —
// which it may do in a process that never mounts a screen. Hence a bare import
// at module scope rather than a lazy one inside the trip screen.
import '@/core/services/location-tracker';

SplashScreen.preventAutoHideAsync();

/**
 * FCM background/quit handler. Must be registered at module scope, outside
 * React — mirrors _firebaseMessagingBackgroundHandler in main.dart. The tap
 * itself is handled by the notification hook once the tree is mounted.
 *
 * It used to be a no-op, which was fine when every push carried its own
 * notification block. Broadcast offers may be data-only, and a data-only push
 * shows nothing unless something here posts it — so this is now the path that
 * makes a pocketed phone ring for a new order.
 */
// Native only. On web there is no Firebase app to attach to, so calling this
// throws "No Firebase App '[DEFAULT]' has been created" the moment the bundle
// evaluates — which is what you get for opening the Metro URL in a browser
// instead of the app. Web is not a target this app supports (MMKV, Maps and
// the rest are native too); this guard just keeps that mistake from looking
// like a crash in the app itself.
if (Platform.OS !== 'web') {
  messaging().setBackgroundMessageHandler((message) =>
    NotificationManager.handleBackgroundMessage(message),
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  // Hide the native splash only after the first frame has laid out; hiding it
  // as soon as fonts resolve leaves a black gap before React paints.
  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Subscribed at the root, not in a screen: a driver waiting on approval may
  // be on the waiting screen, login or registration, and only the root is
  // mounted for all three. The store holds the result, and whichever of those
  // screens is showing renders it.
  useEffect(
    () =>
      onRegistrationDecision((status, reason) =>
        useRegistrationStore.getState().showPushedDecision(status, reason),
      ),
    [],
  );

  // The realtime layer lives above the router, not on a screen: an order offer
  // has to reach the driver whichever screen they are on, and must survive
  // navigation between them.
  useEffect(() => Dispatch.start(), []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayoutRootView}>
      <KeyboardProvider>
        <SafeAreaProvider>
          {/* Every surface is light, so status-bar glyphs must be dark. */}
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/otp" />
            <Stack.Screen name="(auth)/register" />
            <Stack.Screen name="(auth)/pending-approval" />
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="history" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="trip/[id]" />
          </Stack>

          {/* Above the Stack, so the registration popup belongs to the app
              rather than to whichever screen happened to raise it — one copy,
              outliving the navigation between them. */}
          <RegistrationOutcomeHost />

          {/* Rendered as a sibling of the whole stack so it covers every
              screen, including modals, and is not unmounted by navigation. */}
          <JobOfferOverlay />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
