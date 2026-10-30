/**
 * Port of lib/screens/trips_history/view/trips_history.dart +
 * sub_view/trip_history_cell.dart.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/app-bar';
import { NotificationBell } from '@/components/notification-bell';
import { Sidebar } from '@/components/sidebar';
import { AppColors, Primary } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { useHistoryStore } from '@/features/history/history-store';
import { DayHeading, EmptyTrips, TripCard, headingFor } from '@/features/history/trip-card';
import { useNotificationStore } from '@/features/notification/notification-store';

export default function HistoryScreen() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLoading = useHistoryStore((s) => s.isLoading);
  const tripHistory = useHistoryStore((s) => s.tripHistory);
  const completedTripCount = useHistoryStore((s) => s.completedTripCount);
  const hasNextPage = useHistoryStore((s) => s.hasNextPage);
  const notificationCount = useNotificationStore((s) => s.notificationCount);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    useHistoryStore.getState().reset();
    void useHistoryStore.getState().getTripHistory();
    void useNotificationStore.getState().getNotificationCount();
  }, []);

  const isEmpty = !isLoading && !hasNextPage && tripHistory.length === 0;

  const refresh = async () => {
    setRefreshing(true);
    useHistoryStore.getState().reset();
    await useHistoryStore.getState().getTripHistory();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <AppBar
        title={Strings.sideBarTripHistory}
        leading="menu"
        onLeadingPress={() => setDrawerOpen(true)}
        actions={
          <NotificationBell
            count={notificationCount}
            onPress={() => router.push('/notifications')}
          />
        }
      />

      <FlatList
        data={tripHistory}
        keyExtractor={(item, index) => item.id ?? String(index)}
        contentContainerStyle={[styles.list, { paddingBottom: 24 + insets.bottom }]}
        onEndReached={() => void useHistoryStore.getState().getTripHistory()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            colors={[AppColors.primary]}
            tintColor={AppColors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <CompletedSummary count={completedTripCount} />
            <Text style={styles.sectionTitle}>{Strings.recentTripHistory}</Text>
          </>
        }
        ListEmptyComponent={
          isEmpty ? (
            <EmptyTrips icon="truck-outline" message={Strings.historyEmpty} />
          ) : isLoading && !refreshing ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={AppColors.primary} />
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoading && tripHistory.length > 0 ? (
            <View style={styles.footer}>
              <ActivityIndicator color={AppColors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const heading = headingFor(tripHistory, index);
          return (
            <>
              {heading ? <DayHeading label={heading} /> : null}
              <TripCard trip={item} onPress={() => router.push(`/trip/${item.id ?? ''}`)} />
            </>
          );
        }}
      />

      <Sidebar visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

/** The driver's delivered-trip count, the first thing on the screen. */
function CompletedSummary({ count }: { count: number }) {
  return (
    <LinearGradient
      colors={[AppColors.primary, Primary.c900, Primary.c800]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.summary}
    >
      <View style={styles.summaryText}>
        <Text style={styles.summaryLabel}>{Strings.tripComplete}</Text>
        <Text style={styles.summaryCount}>{count}</Text>
      </View>
      <View style={styles.summaryIcon}>
        <MaterialCommunityIcons name="truck-check-outline" size={34} color={AppColors.white} />
      </View>
      {/* Soft rings in the corner, so the card is not a flat slab of colour. */}
      <View style={[styles.ring, styles.ringLarge]} />
      <View style={[styles.ring, styles.ringSmall]} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 3,
  },
  summaryText: { flex: 1 },
  summaryLabel: { ...Typography.body1.semiBold, color: Primary.c200 },
  summaryCount: { ...Typography.h1.extraBold, color: AppColors.white, marginTop: 2 },
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 18,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  ringLarge: { width: 180, height: 180, right: -60, top: -70 },
  ringSmall: { width: 110, height: 110, right: 40, bottom: -70 },
  screen: { flex: 1, backgroundColor: '#F7F9FA' },
  list: { padding: 12, paddingBottom: 24, flexGrow: 1 },
  sectionTitle: {
    ...Typography.h4.extraBold,
    color: AppColors.text,
    marginTop: 18,
  },
  center: { paddingVertical: 48, alignItems: 'center' },
  footer: { padding: 16, alignItems: 'center' },
});
