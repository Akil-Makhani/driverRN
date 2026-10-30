/**
 * Trips this driver handed back after accepting, and — on the second tab —
 * offers they turned down without accepting.
 *
 * Modelled on the history screen — same cell, same paging — but its own list,
 * because a driver looking for "the one I cancelled this morning" should not
 * have to scroll past every completed trip to find it.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/app-bar';
import { NotificationBell } from '@/components/notification-bell';
import { Sidebar } from '@/components/sidebar';
import { AppColors, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { useCancelledStore } from '@/features/history/cancelled-store';
import { useRejectedStore } from '@/features/history/rejected-store';
import {
  DayHeading,
  EmptyTrips,
  RejectedCard,
  TripCard,
  headingFor,
} from '@/features/history/trip-card';
import { useNotificationStore } from '@/features/notification/notification-store';

type Tab = 'cancelled' | 'rejected';

export default function CancelledTripsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('cancelled');
  const [refreshing, setRefreshing] = useState(false);
  // The Rejected list loads the first time its tab is opened, not up front.
  const rejectedFetched = useRef(false);

  const cancelledLoading = useCancelledStore((s) => s.isLoading);
  const cancelledLoaded = useCancelledStore((s) => s.loaded);
  const trips = useCancelledStore((s) => s.trips);

  const rejectedLoading = useRejectedStore((s) => s.isLoading);
  const rejectedLoaded = useRejectedStore((s) => s.loaded);
  const jobs = useRejectedStore((s) => s.jobs);

  const notificationCount = useNotificationStore((s) => s.notificationCount);

  useEffect(() => {
    useCancelledStore.getState().reset();
    void useCancelledStore.getState().getCancelledTrips();
    void useNotificationStore.getState().getNotificationCount();
  }, []);

  const openTab = (next: Tab) => {
    setTab(next);
    if (next === 'rejected' && !rejectedFetched.current) {
      rejectedFetched.current = true;
      useRejectedStore.getState().reset();
      void useRejectedStore.getState().getRejectedJobs();
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    if (tab === 'cancelled') {
      useCancelledStore.getState().reset();
      await useCancelledStore.getState().getCancelledTrips();
    } else {
      useRejectedStore.getState().reset();
      await useRejectedStore.getState().getRejectedJobs();
    }
    setRefreshing(false);
  };

  const isLoading = tab === 'cancelled' ? cancelledLoading : rejectedLoading;
  const count = tab === 'cancelled' ? trips.length : jobs.length;
  const isEmpty =
    (tab === 'cancelled' ? cancelledLoaded : rejectedLoaded) && !isLoading && count === 0;

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      colors={[AppColors.primary]}
      tintColor={AppColors.primary}
    />
  );

  const banner = (
    <View style={[styles.banner, tab === 'rejected' && styles.bannerGrey]}>
      <MaterialCommunityIcons
        name="information-outline"
        size={20}
        color={tab === 'cancelled' ? AppColors.error600 : TextShade.c600}
      />
      <Text style={styles.bannerText}>
        {tab === 'cancelled' ? Strings.cancelledTripsSubtitle : Strings.rejectedSubtitle}
      </Text>
    </View>
  );

  const emptyOrSpinner = isEmpty ? (
    tab === 'cancelled' ? (
      <EmptyTrips icon="emoticon-happy-outline" message={Strings.cancelledTripsEmpty} />
    ) : (
      <EmptyTrips icon="thumb-up-outline" message={Strings.rejectedEmpty} />
    )
  ) : isLoading && !refreshing ? (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={AppColors.primary} />
    </View>
  ) : null;

  const footer =
    isLoading && count > 0 ? (
      <View style={styles.footer}>
        <ActivityIndicator color={AppColors.primary} />
      </View>
    ) : null;

  const listStyle = [styles.list, { paddingBottom: 24 + insets.bottom }];

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

      <View style={styles.tabs}>
        <TabButton
          label={Strings.statusCancelled}
          icon="close-circle-outline"
          active={tab === 'cancelled'}
          onPress={() => openTab('cancelled')}
        />
        <TabButton
          label={Strings.tabRejected}
          icon="hand-back-left-outline"
          active={tab === 'rejected'}
          onPress={() => openTab('rejected')}
        />
      </View>

      {tab === 'cancelled' ? (
        <FlatList
          key="cancelled"
          data={trips}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={listStyle}
          onEndReached={() => void useCancelledStore.getState().getCancelledTrips()}
          onEndReachedThreshold={0.4}
          refreshControl={refreshControl}
          ListHeaderComponent={banner}
          ListEmptyComponent={emptyOrSpinner}
          ListFooterComponent={footer}
          renderItem={({ item, index }) => {
            const heading = headingFor(trips, index);
            return (
              <>
                {heading ? <DayHeading label={heading} /> : null}
                <TripCard
                  trip={item}
                  cancelled
                  onPress={() => router.push(`/trip/${item.id ?? ''}`)}
                />
              </>
            );
          }}
        />
      ) : (
        <FlatList
          key="rejected"
          data={jobs}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={listStyle}
          onEndReached={() => void useRejectedStore.getState().getRejectedJobs()}
          onEndReachedThreshold={0.4}
          refreshControl={refreshControl}
          ListHeaderComponent={banner}
          ListEmptyComponent={emptyOrSpinner}
          ListFooterComponent={footer}
          renderItem={({ item, index }) => {
            const heading = headingFor(jobs, index, (j) => j.rejectedAtIso);
            return (
              <>
                {heading ? <DayHeading label={heading} /> : null}
                <RejectedCard job={item} />
              </>
            );
          }}
        />
      )}

      <Sidebar visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  const color = active ? AppColors.white : TextShade.c700;
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={[styles.tabText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9FA' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 4,
    borderRadius: 14,
    backgroundColor: AppColors.white,
    borderWidth: 1,
    borderColor: TextShade.c100,
  },
  tab: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: AppColors.primary },
  tabText: { ...Typography.button2.extraBold, marginLeft: 6 },
  list: { padding: 12, flexGrow: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  bannerGrey: { backgroundColor: TextShade.c100 },
  bannerText: {
    ...Typography.body2.regular,
    color: TextShade.c800,
    flex: 1,
    marginLeft: 8,
  },
  center: { paddingVertical: 48, alignItems: 'center' },
  footer: { padding: 16, alignItems: 'center' },
});
