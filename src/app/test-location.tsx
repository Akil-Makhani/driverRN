/**
 * Only for drivers the admin gave Test location access (Tempo > Driver Access
 * in the panel): how far this driver is from each pickup.
 *
 * Tempo orders are offered in rings around EACH pickup - drivers within the
 * first ring of it, then the next, and so on. A phone has one position, so it
 * cannot stand 5 km from pickup 1 and 25 km from pickup 2 at once. Instead
 * the tester types a km for pickup 1, 2, 3... and the server's rings use that
 * distance for this driver for that pickup of every tempo order
 * (AppDriver.testPickupKm), wherever the phone really is. A pickup left blank
 * falls back to the phone's position. Every other driver has no way in.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { useSession } from '@/core/session';
import { JobRepository } from '@/core/services/job-repository';
import { LocationTracker } from '@/core/services/location-tracker';

/** Matches the server's MAX_TEST_PICKUPS. */
const MAX_PICKUPS = 10;

const parseKm = (text: string): number | null | typeof NaN => {
  const t = text.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 500 ? n : NaN;
};

const describe = (km: (number | null)[]): string => {
  const set = km
    .map((v, i) => (v == null ? null : `Pickup ${i + 1}: ${v} km`))
    .filter(Boolean);
  return set.length ? set.join(' · ') : 'Not set - real GPS';
};

export default function TestLocationScreen() {
  const router = useRouter();
  /** One box per pickup; at least two so a two-pickup order is one tap away. */
  const [rows, setRows] = useState<string[]>(['', '']);
  /** What the server has now. */
  const [saved, setSaved] = useState<(number | null)[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const allowed = useSession((s) => s.user?.testLocationAccess === true);

  // The admin can switch access off while the driver is on this screen; the
  // next profile load (the menu, the dashboard) then sends them home.
  useEffect(() => {
    if (!allowed) router.dismissTo('/dashboard');
  }, [allowed, router]);

  const load = useCallback(() => {
    void JobRepository.getTestPickupKm().then((km) => {
      if (km == null) {
        setEnabled(false);
        return;
      }
      setEnabled(true);
      setSaved(km);
      const texts = km.map((v) => (v == null ? '' : String(v)));
      while (texts.length < 2) texts.push('');
      setRows(texts);
    });
  }, []);

  // The side menu opens this on top of the dashboard, so Back would get there
  // anyway; dismissTo also covers a stack where the dashboard is missing.
  useFocusEffect(
    useCallback(() => {
      if (allowed) load();
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.dismissTo('/dashboard');
        return true;
      });
      return () => sub.remove();
    }, [allowed, router, load]),
  );

  if (!allowed) return null;

  const values = rows.map(parseKm);
  const invalid = values.some((v) => Number.isNaN(v));

  const save = async (km: (number | null)[]) => {
    setBusy(true);
    setMessage(null);
    try {
      const stored = await JobRepository.setTestPickupKm(km);
      setSaved(stored);
      setMessage('Saved. New orders will ring you at these distances.');
    } catch (error: any) {
      setMessage(error?.message || 'Could not save. Try again.');
    }
    setBusy(false);
  };

  const clearAll = async () => {
    // The single stand-in position from older builds goes too.
    await LocationTracker.setTestLocation(null);
    setRows(['', '']);
    await save([]);
  };

  return (
    <View style={styles.screen}>
      {/* A side-menu screen like History and Profile: the menu, not Back. */}
      <AppBar title="Test location" leading="menu" onLeadingPress={() => setDrawerOpen(true)} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.note}>
          Testing only. Type how many km you are from each pickup of an order and tap Save.
          Every new tempo order then rings you as if you stood that far from each of its pickups.
          Leave a pickup blank to use your real GPS for it.
        </Text>

        {!enabled && (
          <Text style={styles.warning}>Test distances are switched off on this server.</Text>
        )}

        {rows.map((text, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.rowLabel}>{`Pickup ${i + 1}`}</Text>
            <TextInput
              style={[styles.input, styles.kmInput, Number.isNaN(values[i]) && styles.inputError]}
              value={text}
              onChangeText={(t) => setRows((r) => r.map((v, j) => (j === i ? t : v)))}
              placeholder="km, e.g. 5"
              placeholderTextColor={TextShade.c500}
              keyboardType="decimal-pad"
            />
            <Text style={styles.unit}>km</Text>
            {rows.length > 1 && (
              <Pressable
                hitSlop={8}
                onPress={() => setRows((r) => r.filter((_, j) => j !== i))}
                style={styles.remove}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            )}
          </View>
        ))}
        {invalid && <Text style={styles.warning}>Enter km between 0 and 500, e.g. 17 or 4.5</Text>}

        {rows.length < MAX_PICKUPS && (
          <Pressable onPress={() => setRows((r) => [...r, ''])} style={styles.option}>
            <Text style={styles.optionText}>+ Add pickup</Text>
          </Pressable>
        )}

        <Pressable
          disabled={busy || invalid || !enabled}
          onPress={() => void save(values as (number | null)[])}
          style={[styles.saveButton, (busy || invalid || !enabled) && styles.disabled]}
        >
          <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save'}</Text>
        </Pressable>

        {message && <Text style={styles.hint}>{message}</Text>}
        <Text style={styles.current}>{`Now: ${describe(saved)}`}</Text>

        <Pressable disabled={busy} onPress={() => void clearAll()} style={styles.option}>
          <Text style={styles.optionText}>Clear all - use real GPS</Text>
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
  hint: { ...Typography.body2.medium, color: TextShade.c700 },
  current: { ...Typography.body1.bold, color: AppColors.text, marginVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { ...Typography.body1.bold, color: AppColors.text, width: 76 },
  unit: { ...Typography.body1.medium, color: TextShade.c700 },
  remove: { paddingHorizontal: 6 },
  removeText: { ...Typography.body1.bold, color: AppColors.error500 },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Primary.c300,
  },
  optionText: { ...Typography.body1.semiBold, color: AppColors.text },
  saveButton: {
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
  },
  saveText: { ...Typography.body1.semiBold, color: AppColors.white },
  disabled: { opacity: 0.4 },
  warning: { ...Typography.body2.semiBold, color: AppColors.error500 },
  kmInput: { flex: 1 },
  input: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Primary.c300,
    ...Typography.body1.medium,
    color: AppColors.text,
  },
  inputError: { borderColor: AppColors.error500 },
});
