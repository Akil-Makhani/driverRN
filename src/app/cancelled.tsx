/**
 * Trips this driver handed back after accepting.
 *
 * Modelled on the history screen — same cell, same paging — but its own list,
 * because a driver looking for "the one I cancelled this morning" should not
 * have to scroll past every completed trip to find it.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppBar } from '@/components/app-bar';
import { NotificationBell } from '@/components/notification-bell';
import { Sidebar } from '@/components/sidebar';
import { AppColors, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { useCancelledStore } from '@/features/history/cancelled-store';
import { useNotificationStore } from '@/features/notification/notification-store';
import type { TripDoc } from '@/types/history';

export default function CancelledTripsScreen() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLoading = useCancelledStore((s) => s.isLoading);
  const loaded = useCancelledStore((s) => s.loaded);
  const trips = useCancelledStore((s) => s.trips);
  const notificationCount = useNotificationStore((s) => s.notificationCount);

  useEffect(() => {
    useCancelledStore.getState().reset();
    void useCancelledStore.getState().getCancelledTrips();
    void useNotificationStore.getState().getNotificationCount();
  }, []);

  const isEmpty = loaded && trips.length === 0;

  return (
    <View style={styles.screen}>
      <AppBar
        title={Strings.sideBarCancelledTrips}
        leading="menu"
        onLeadingPress={() => setDrawerOpen(true)}
        actions={
          <NotificationBell
            count={notificationCount}
            onPress={() => router.push('/notifications')}
          />
        }
      />

      <View style={styles.body}>
        <Text style={styles.subtitle}>{Strings.cancelledTripsSubtitle}</Text>

        {isLoading && trips.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={AppColors.primary} />
          </View>
        ) : isEmpty ? (
          <View style={styles.center}>
            <Text style={styles.empty}>{Strings.cancelledTripsEmpty}</Text>
          </View>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item, index) => item.id ?? String(index)}
            onEndReached={() => void useCancelledStore.getState().getCancelledTrips()}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoading ? (
                <View style={styles.footer}>
                  <ActivityIndicator color={AppColors.primary} />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <CancelledCell
                trip={item}
                onPress={() => router.push(`/trip/${item.id ?? ''}`)}
              />
            )}
          />
        )}
      </View>

      <Sidebar visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

function CancelledCell({ trip, onPress }: { trip: TripDoc; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.cell}>
      <Text style={styles.cellAddress}>{trip.pickupAddress ?? ''}</Text>
      <View style={styles.cellRow}>
        <Text style={styles.cellDate}>{trip.updatedAt ?? ''}</Text>
        <Text style={styles.cellTrip}>{`Trip: #${trip.driverTripNumber ?? ''}`}</Text>
        <Text style={styles.cellStatus}>{trip.state?.label ?? ''}</Text>
      </View>
      <View style={styles.divider} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  body: { flex: 1, padding: 10 },
  subtitle: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    marginTop: 10,
    marginBottom: 15,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { ...Typography.body1.regular, color: TextShade.c700, textAlign: 'center' },
  footer: { padding: 16, alignItems: 'center' },
  cell: { paddingVertical: 5 },
  cellAddress: { ...Typography.subtitle2.extraBold, color: AppColors.text },
  cellRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  cellDate: { ...Typography.caption.regular, color: TextShade.c700 },
  cellTrip: { ...Typography.body2.regular, color: TextShade.c700, marginLeft: 5 },
  cellStatus: {
    ...Typography.body2.extraBold,
    color: AppColors.error600,
    marginLeft: 'auto',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: TextShade.c300,
    marginTop: 10,
  },
});
