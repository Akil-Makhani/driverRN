/** Port of lib/screens/dashboard/view/dashboard_view.dart. */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { AppBar } from '@/components/app-bar';
import { NotificationBell } from '@/components/notification-bell';
import { Sidebar } from '@/components/sidebar';
import { AppColors, Primary } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { LocationTracker } from '@/core/services/location-tracker';
import { NotificationManager } from '@/core/services/notification-manager';
import { ensureLocationPermission } from '@/core/utils/maps';
import { DashboardCell } from '@/features/dashboard/dashboard-cell';
import {
  DashboardEmptyView,
  DashboardTopView,
  DeliverAllCell,
} from '@/features/dashboard/dashboard-parts';
import { useDashboardStore } from '@/features/dashboard/dashboard-store';
import { useNotificationStore } from '@/features/notification/notification-store';
import type { TripItem } from '@/types/trip';

/** The deliver-all card is a synthetic first row, so the list is heterogeneous. */
type Row = { kind: 'deliverAll' } | { kind: 'trip'; trip: TripItem };

export default function DashboardScreen() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLoading = useDashboardStore((s) => s.isLoading);
  const activeTrips = useDashboardStore((s) => s.activeTrips);
  const inTransitTrips = useDashboardStore((s) => s.inTransitTrips);
  const completedTripCount = useDashboardStore((s) => s.completedTripCount);
  const dutyValue = useDashboardStore((s) => s.selectedDutyValue);
  const notificationCount = useNotificationStore((s) => s.notificationCount);

  // Refetch whenever the dashboard regains focus — returning from a trip
  // detail must show the status the driver just changed. Replaces both the
  // Flutter initState fetch and the goBack() refresh in TripDetail.
  useFocusEffect(
    useCallback(() => {
      void useDashboardStore.getState().getTrips();
      void useNotificationStore.getState().getNotificationCount();
    }, []),
  );

  // Products are static for the session; fetch once.
  useEffect(() => {
    void useDashboardStore.getState().getProducts();
  }, []);

  /**
   * Resume tracking for a driver who was already on duty when the app opened —
   * the toggle handler only covers a change made in this session.
   *
   * The provider tags each ping with the trip in progress, preferring an
   * in-transit one since that is the leg whose route matters most.
   */
  useEffect(() => {
    if (useDashboardStore.getState().selectedDutyValue) {
      void LocationTracker.start();
    }
    // Deliberately no cleanup: tracking is tied to duty, not to this screen
    // being mounted. Stopping here would end it whenever the driver opened a
    // trip. Logout and the duty toggle stop it instead.
  }, []);

  /**
   * Persist which trip a ping belongs to. The background task runs in its own
   * JS context with no access to this store, so the tag has to go through
   * storage. Prefers an in-transit trip — that is the leg whose route matters.
   */
  useEffect(() => {
    const trip = inTransitTrips[0] ?? activeTrips[0];
    LocationTracker.setCurrentTrip(
      trip ? { tripId: trip.id, statusNumber: trip.statusNumber } : null,
    );
  }, [activeTrips, inTransitTrips]);

  /**
   * Going on duty is when the driver starts needing directions, so location is
   * requested here rather than at the first map tap. Refusing does not block
   * the toggle — Maps still routes using its own permission, so the duty
   * change goes through either way.
   */
  const handleDutyChange = async (value: boolean) => {
    if (value) await ensureLocationPermission();
    await useDashboardStore.getState().setDuty(value);
    // Position logging follows duty: on duty the driver is working and the
    // trail matters; off duty it would just be tracking their private time.
    if (value) await LocationTracker.start();
    else await LocationTracker.stop();
  };

  // A push while the app is open refreshes the list (replaces
  // dashboardRefreshNotifier); tapping one opens that trip.
  useEffect(
    () =>
      NotificationManager.register({
        onForeground: () => {
          void useDashboardStore.getState().getTrips();
          void useNotificationStore.getState().getNotificationCount();
        },
        onOpen: (tripId) => {
          if (tripId) router.push(`/trip/${tripId}`);
        },
      }),
    [router],
  );

  const rows: Row[] = [
    ...(inTransitTrips.length > 0 ? [{ kind: 'deliverAll' as const }] : []),
    ...activeTrips.map((trip) => ({ kind: 'trip' as const, trip })),
  ];

  const isEmpty = activeTrips.length === 0 && inTransitTrips.length === 0;

  return (
    <View style={styles.screen}>
      <AppBar
        leading="menu"
        onLeadingPress={() => setDrawerOpen(true)}
        titleContent={
          <View style={styles.dutyRow}>
            <Switch
              value={dutyValue}
              onValueChange={(v) => void handleDutyChange(v)}
              trackColor={{ true: AppColors.success500, false: Primary.c300 }}
              thumbColor={AppColors.white}
            />
            <Text style={styles.dutyText}>{Strings.onDuty}</Text>
          </View>
        }
        actions={
          <NotificationBell
            count={notificationCount}
            onPress={() => router.push('/notifications')}
          />
        }
      />

      <View style={styles.body}>
        <View style={styles.topWrap}>
          <DashboardTopView completedTripCount={completedTripCount} />
        </View>

        {isLoading && isEmpty ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={AppColors.primary} />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row, index) =>
              row.kind === 'deliverAll' ? 'deliver-all' : row.trip.id ?? String(index)
            }
            contentContainerStyle={isEmpty ? styles.emptyContent : undefined}
            ListEmptyComponent={<DashboardEmptyView />}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={() => void useDashboardStore.getState().getTrips()}
                colors={[AppColors.primary]}
                tintColor={AppColors.primary}
              />
            }
            renderItem={({ item }) =>
              item.kind === 'deliverAll' ? (
                <DeliverAllCell
                  trips={inTransitTrips}
                  onPress={() =>
                    void useDashboardStore.getState().deliverAll({
                      tripIds: inTransitTrips
                        .map((t) => t.id)
                        .filter((id): id is string => id != null),
                    })
                  }
                />
              ) : (
                <DashboardCell
                  trip={item.trip}
                  onPress={() => router.push(`/trip/${item.trip.id ?? ''}`)}
                  onAcceptPress={() =>
                    void useDashboardStore.getState().acceptTrip(item.trip.id ?? '')
                  }
                />
              )
            }
          />
        )}
      </View>

      <Sidebar visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  body: { flex: 1, paddingVertical: 10 },
  topWrap: { paddingHorizontal: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContent: { flexGrow: 1 },
  dutyRow: { flexDirection: 'row', alignItems: 'center' },
  dutyText: { ...Typography.h4.extraBold, color: AppColors.text, marginLeft: 5 },
});
