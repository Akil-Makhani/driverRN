import messaging from '@react-native-firebase/messaging';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { onRegistrationDecision } from '@/core/services/notification-manager';
import { useAppFonts } from '@/core/theme/use-app-fonts';
import { RegistrationOutcomeHost } from '@/features/auth/registration-outcome-host';
import { useRegistrationStore } from '@/features/auth/registration-store';

SplashScreen.preventAutoHideAsync();

/**
 * FCM background/quit handler. Must be registered at module scope, outside
 * React — mirrors _firebaseMessagingBackgroundHandler in main.dart. The tap
 * itself is handled by the notification hook once the tree is mounted.
 */
messaging().setBackgroundMessageHandler(async () => {});

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
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
