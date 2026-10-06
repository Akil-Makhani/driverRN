/**
 * Debug builds only: stand this driver at a chosen distance from Morbi.
 *
 * Tempo orders are offered in rings around the pickup - drivers within 5 km
 * first, then 10 km, and so on - and pickups are in Morbi. A tester anywhere
 * else would never be in any ring, so this reports a fixed position in place
 * of the GPS (LocationTracker.setTestLocation). Release builds have no way in.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Sidebar } from '@/components/sidebar';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Typography } from '@/core/constants/typography';
import { LocationTracker, type TestLocation } from '@/core/services/location-tracker';

/** Where the distances count from when no pickup is given: Morbi town centre. */
const MORBI = { latitude: 22.8173, longitude: 70.8378 };
const KM_PER_DEGREE_LAT = 111.32;

type Point = { latitude: number; longitude: number };

/** "22.8653, 70.9333" -> a point, or null while it is not one yet. */
const parsePoint = (text: string): Point | null => {
  const [lat, lng] = text.split(',').map((v) => Number(v.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { latitude: lat, longitude: lng };
};

const presetFor = (km: number, from: Point, fromLabel: string): TestLocation => ({
  latitude: Math.round((from.latitude + km / KM_PER_DEGREE_LAT) * 1e6) / 1e6,
  longitude: from.longitude,
  label: km === 0 ? `At ${fromLabel}` : `${km} km from ${fromLabel}`,
});

export default function TestLocationScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState(() => LocationTracker.getTestLocation());
  /** The order's pickup, typed in so the distances count from it. */
  const [pickupText, setPickupText] = useState('');
  /** How far from `from` to stand, typed in km (0 = right at it). */
  const [kmText, setKmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Opened from the side menu, which replaces the screen, so there is nothing
  // behind it to go back to: Back goes home instead of throwing GO_BACK.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace('/dashboard');
        return true;
      });
      return () => sub.remove();
    }, [router]),
  );

  if (!__DEV__) return null;

  const apply = async (test: TestLocation | null) => {
    setBusy(true);
    await LocationTracker.setTestLocation(test);
    setCurrent(LocationTracker.getTestLocation());
    setBusy(false);
  };

  const pickup = parsePoint(pickupText);
  const from = pickup ?? MORBI;
  const fromLabel = pickup ? 'pickup' : 'Morbi centre';
  const km = kmText.trim() === '' ? NaN : Number(kmText.trim());
  const kmValid = Number.isFinite(km) && km >= 0 && km <= 500;

  return (
    <View style={styles.screen}>
      {/* A side-menu screen like History and Profile: the menu, not Back. */}
      <AppBar title="Test location" leading="menu" onLeadingPress={() => setDrawerOpen(true)} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.note}>
          Debug build only. Type a distance in km and tap Set. The app then reports that position
          instead of the GPS, so a new tempo order is offered to you as if you stood there.
        </Text>
        <Text style={styles.note}>
          The distance counts from Morbi centre. For an exact distance from the order&apos;s
          pickup, paste the pickup&apos;s latitude, longitude below first (optional).
        </Text>

        <TextInput
          style={styles.input}
          value={pickupText}
          onChangeText={setPickupText}
          placeholder="Pickup: latitude, longitude (optional)"
          placeholderTextColor={TextShade.c500}
          keyboardType="numbers-and-punctuation"
        />
        {pickupText.length > 0 && !pickup && (
          <Text style={styles.warning}>Write it as  22.8653, 70.9333</Text>
        )}

        <Text style={styles.current}>
          {current ? `Now: ${current.label}` : 'Now: real GPS'}
        </Text>

        <View style={styles.kmRow}>
          <TextInput
            style={[styles.input, styles.kmInput]}
            value={kmText}
            onChangeText={setKmText}
            placeholder="Distance in km, e.g. 17"
            placeholderTextColor={TextShade.c500}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={() => kmValid && void apply(presetFor(km, from, fromLabel))}
          />
          <Pressable
            disabled={busy || !kmValid}
            onPress={() => void apply(presetFor(km, from, fromLabel))}
            style={[styles.setButton, (busy || !kmValid) && styles.setButtonDisabled]}
          >
            <Text style={styles.optionTextSelected}>Set</Text>
          </Pressable>
        </View>
        {kmText.length > 0 && !kmValid && (
          <Text style={styles.warning}>Enter a number of km, e.g. 17 or 4.5</Text>
        )}

        <Pressable disabled={busy} onPress={() => void apply(null)} style={styles.option}>
          <Text style={styles.optionText}>Use real GPS</Text>
        </Pressable>
      </ScrollView>

      <Sidebar visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  content: { padding: 16, gap: 10 },
  note: { ...Typography.body2.semiBold, color: TextShade.c700 },
  current: { ...Typography.body1.bold, color: AppColors.text, marginVertical: 6 },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Primary.c300,
  },
  kmRow: { flexDirection: 'row', gap: 10 },
  kmInput: { flex: 1 },
  setButton: {
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 6,
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
  },
  setButtonDisabled: { opacity: 0.4 },
  optionText: { ...Typography.body1.semiBold, color: AppColors.text },
  optionTextSelected: { ...Typography.body1.semiBold, color: AppColors.white },
  warning: { ...Typography.body2.semiBold, color: AppColors.error500 },
  input: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Primary.c300,
    ...Typography.body1.medium,
    color: AppColors.text,
  },
});
