/**
 * Route icon shown on a dashboard trip cell.
 *
 * The trip-list endpoint returns `pickupAddress` as a bare display string and
 * no delivery address at all, so the full addresses are fetched on demand from
 * the trip-details endpoint when the icon is tapped. That keeps the list load
 * unchanged (one request, as before) and costs a request only when the driver
 * actually wants directions.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { AppColors, Primary } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { DashboardRepository } from '@/core/services/dashboard-repository';
import {
  activeDestination,
  canShowRoute,
  ensureLocationPermission,
  openRoute,
} from '@/core/utils/maps';
import { isSuccess } from '@/types/api';

interface Props {
  tripId: string;
}

export function RouteButton({ tripId }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (isLoading || !tripId) return;
    setIsLoading(true);
    try {
      // Normally already granted at the On Duty toggle; this catches the case
      // where it was refused or revoked. Routing still proceeds either way —
      // Maps uses its own permission — so a refusal only costs the blue dot.
      await ensureLocationPermission();

      const response = await DashboardRepository.getTripDetails(tripId);
      // Navigate from the driver's current location to wherever this trip is
      // headed next — the pickup until the load is collected, then the drop.
      const destination = isSuccess(response)
        ? activeDestination(response.data)
        : undefined;

      if (!canShowRoute(destination)) {
        Alert.alert(Strings.viewRoute, Strings.routeUnavailable);
        return;
      }
      await openRoute(destination);
    } catch (e) {
      if (__DEV__) console.log('openRoute failed:', e);
      Alert.alert(Strings.viewRoute, Strings.routeUnavailable);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Pressable
      onPress={() => void handlePress()}
      // Stop the tap bubbling to the cell, which would open the trip instead.
      onStartShouldSetResponder={() => true}
      hitSlop={8}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={Strings.viewRoute}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={AppColors.primary} />
      ) : (
        <Ionicons name="map-outline" size={18} color={AppColors.primary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    marginLeft: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
