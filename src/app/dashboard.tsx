/** Port of lib/screens/dashboard/view/dashboard_view.dart. */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { LocationDisclosureDialog } from '@/components/location-disclosure-dialog';
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
import { PendingOffersStrip } from '@/features/job/pending-offers-strip';
import { useNotificationStore } from '@/features/notification/notification-store';
import type { TripItem } from '@/types/trip';

/** The deliver-all card is a synthetic first row, so the list is heterogeneous. */
type Row = { kind: 'deliverAll' } | { kind: 'trip'; trip: TripItem };

export default function DashboardScreen() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [disclosureVisible, setDisclosureVisible] = useState(false);

  /**
   * Resolver for the disclosure currently on screen.
   *
   * The tracker asks for consent inside an async call, but the answer arrives
   * from a rendered modal, so the promise is held open here until the driver
   * taps. A ref rather than state: resolving must not depend on a re-render
   * having flushed.
   */
  const disclosureResolve = useRef<((granted: boolean) => void) | null>(null);

  const answerDisclosure = useCallback((granted: boolean) => {
    setDisclosureVisible(false);
    disclosureResolve.current?.(granted);
    disclosureResolve.current = null;
  }, []);

  /**
   * Shows the prominent disclosure and resolves with the driver's answer. The
   * tracker will only reach the OS permission prompt if this returns true —
   * that ordering is what Google Play requires.
   */
  const confirmLocationDisclosure = useCallback(() => {
    // A second call while one is open would strand the first promise; reuse is
    // not needed, so refuse rather than leak it.
    if (disclosureResolve.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      disclosureResolve.current = resolve;
      setDisclosureVisible(true);
    });
  }, []);

  // Unmounting with a disclosure open (logout, for one) must not leave the
  // tracker awaiting a promise that can never settle.
  useEffect(
    () => () => {
      disclosureResolve.current?.(false);
      disclosureResolve.current = null;
    },
    [],
  );

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
   * Going on duty is when the driver starts needing directions, so location is
   * requested here rather than at the first map tap. Refusing does not block
   * the toggle — Maps still routes using its own permission, so the duty
   * change goes through either way.
   *
   * Starting and stopping the reporting itself is not done here: the dispatch
   * layer follows the duty value, which also covers a driver who was already
   * on duty when the app opened. This handler adds only what needs a screen —
   * the disclosure in front of the background-location prompt, which is the
   * one request that is never made without a driver action.
   */
  const handleDutyChange = async (value: boolean) => {
    if (value) await ensureLocationPermission();
    await useDashboardStore.getState().setDuty(value);
    if (value) await LocationTracker.requestBackground(confirmLocationDisclosure);
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

        {/* Offers the driver pushed aside. Renders nothing when there are
            none, so the dashboard is unchanged for everyone else. */}
        <PendingOffersStrip />

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

      <LocationDisclosureDialog
        visible={disclosureVisible}
        onAccept={() => answerDisclosure(true)}
        onDecline={() => answerDisclosure(false)}
      />
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
