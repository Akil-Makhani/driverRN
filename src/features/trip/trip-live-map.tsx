/**
 * The live map on the trip screen.
 *
 * This is the driver's view of the same picture the customer is watching, and
 * it exists for a reason beyond navigation — the app is now reporting the
 * driver's position to a stranger, and showing them exactly what is being
 * shared is the honest way to do that. The status strip under the map says in
 * plain words whether the stream is live.
 *
 * Turn-by-turn still hands off to Google Maps. Rebuilding navigation in-app
 * would be worse than the thing every driver already has open.
 */
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { TripStatusNumber } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { DispatchSocket } from '@/core/realtime/socket';
import { addressTitle } from '@/core/utils/maps';
import type { Address, TripDetailsData } from '@/types/trip';

/** Roughly a 3km box — close enough to read street names, wide enough to orient. */
const DEFAULT_DELTA = 0.03;

/**
 * Addresses carry coordinates as strings, and the API sends them inconsistently
 * (absent, empty, or "0"). Anything that does not parse to a usable pair is
 * treated as no coordinate rather than dropped at 0°N 0°E in the Atlantic.
 */
function coordinateOf(
  address?: Address | null,
): { latitude: number; longitude: number } | null {
  const latitude = Number(address?.latitude);
  const longitude = Number(address?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

export function TripLiveMap({ trip }: { trip: TripDetailsData | null }) {
  const [region, setRegion] = useState<Region | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isOnline, setIsOnline] = useState(DispatchSocket.isConnected());

  useEffect(() => DispatchSocket.onConnectionChange(setIsOnline), []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (cancelled) return;
      setHasPermission(permission.granted);
      if (!permission.granted) return;

      // Last-known first so the map opens on somewhere plausible immediately;
      // a cold GPS fix can take ten seconds, and a map that starts at the
      // middle of the ocean and jumps is worse than one that starts stale.
      const cached = await Location.getLastKnownPositionAsync();
      if (!cancelled && cached) {
        setRegion({
          latitude: cached.coords.latitude,
          longitude: cached.coords.longitude,
          latitudeDelta: DEFAULT_DELTA,
          longitudeDelta: DEFAULT_DELTA,
        });
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);
      if (cancelled || !current) return;
      setRegion({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: DEFAULT_DELTA,
        longitudeDelta: DEFAULT_DELTA,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const status = trip?.statusNumber ?? TripStatusNumber.assigned;
  // Nothing is being shared before the driver accepts or after they deliver,
  // so the map would be claiming a stream that does not exist.
  const isSharing =
    status >= TripStatusNumber.accepted && status < TripStatusNumber.delivered;

  if (!isSharing) return null;

  const pickup = coordinateOf(trip?.pickupAddress);
  const drop = coordinateOf(trip?.deliveries?.[0]?.address);

  return (
    <View style={styles.wrap}>
      <View style={styles.mapFrame}>
        {region ? (
          <MapView
            style={StyleSheet.absoluteFill}
            // Google on both platforms, so the driver sees the same rendering
            // and the same road names as the Maps app they navigate with.
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            // The blue dot is drawn natively from the OS location stream, so
            // the driver's own marker costs no JS and no second GPS watcher
            // alongside the one the tracker is already running.
            showsUserLocation={hasPermission}
            showsMyLocationButton
            toolbarEnabled={false}
            loadingEnabled
          >
            {pickup && (
              <Marker
                coordinate={pickup}
                title={addressTitle(trip?.pickupAddress) || Strings.offerPickup}
                pinColor={AppColors.success500}
              />
            )}
            {drop && (
              <Marker
                coordinate={drop}
                title={
                  addressTitle(trip?.deliveries?.[0]?.address) || Strings.offerDrop
                }
                pinColor={AppColors.error500}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {hasPermission ? Strings.liveTracking : Strings.locationPermissionDenied}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statusRow}>
        <View
          style={[styles.pulse, isOnline ? styles.pulseLive : styles.pulseOffline]}
        />
        <Text style={styles.statusText}>
          {isOnline ? Strings.trackingOn : Strings.trackingOffline}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 10 },
  mapFrame: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Primary.c100,
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  placeholderText: {
    ...Typography.body2.regular,
    color: TextShade.c600,
    textAlign: 'center',
  },

  statusRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  pulse: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  pulseLive: { backgroundColor: AppColors.success500 },
  pulseOffline: { backgroundColor: '#F79009' },
  statusText: { ...Typography.caption.semiBold, color: TextShade.c700 },
});
