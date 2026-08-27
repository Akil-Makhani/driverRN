import messaging from '@react-native-firebase/messaging';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppFonts } from '@/core/theme/use-app-fonts';

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
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="history" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="trip/[id]" />
          </Stack>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
