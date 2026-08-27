/**
 * Port of lib/screens/trips_history/view/trips_history.dart +
 * sub_view/trip_history_cell.dart.
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
import { HistoryWalletHeader } from '@/components/history-wallet-header';
import { NotificationBell } from '@/components/notification-bell';
import { Sidebar } from '@/components/sidebar';
import { AppColors, TextShade } from '@/core/constants/colors';
import { TripStatusNumber } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { useHistoryStore } from '@/features/history/history-store';
import { useNotificationStore } from '@/features/notification/notification-store';
import type { TripDoc } from '@/types/history';

export default function HistoryScreen() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLoading = useHistoryStore((s) => s.isLoading);
  const tripHistory = useHistoryStore((s) => s.tripHistory);
  const completedTripCount = useHistoryStore((s) => s.completedTripCount);
  const notificationCount = useNotificationStore((s) => s.notificationCount);

  useEffect(() => {
    useHistoryStore.getState().reset();
    void useHistoryStore.getState().getTripHistory();
    void useNotificationStore.getState().getNotificationCount();
  }, []);

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

      <View style={styles.body}>
        <HistoryWalletHeader
          title={String(completedTripCount)}
          subTitle={Strings.tripComplete}
        />
        <Text style={styles.sectionTitle}>{Strings.recentTripHistory}</Text>

        {isLoading && tripHistory.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={AppColors.primary} />
          </View>
        ) : (
          <FlatList
            data={tripHistory}
            keyExtractor={(item, index) => item.id ?? String(index)}
            onEndReached={() => void useHistoryStore.getState().getTripHistory()}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoading ? (
                <View style={styles.footer}>
                  <ActivityIndicator color={AppColors.primary} />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <HistoryCell
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

function HistoryCell({ trip, onPress }: { trip: TripDoc; onPress: () => void }) {
  const isComplete = trip.statusNumber === TripStatusNumber.delivered;
  return (
    <Pressable onPress={onPress} style={styles.cell}>
      <Text style={styles.cellAddress}>{trip.pickupAddress ?? ''}</Text>
      <View style={styles.cellRow}>
        <Text style={styles.cellDate}>{trip.updatedAt ?? ''}</Text>
        <Text style={styles.cellTrip}>{`Trip: #${trip.driverTripNumber ?? ''}`}</Text>
        <Text
          style={[
            styles.cellStatus,
            { color: isComplete ? AppColors.success500 : AppColors.primary },
          ]}
        >
          {trip.state?.label ?? ''}
        </Text>
      </View>
      <View style={styles.divider} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  body: { flex: 1, padding: 10 },
  sectionTitle: {
    ...Typography.h4.extraBold,
    color: AppColors.text,
    marginTop: 15,
    marginBottom: 15,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 16, alignItems: 'center' },
  cell: { paddingVertical: 5 },
  cellAddress: { ...Typography.subtitle2.extraBold, color: AppColors.text },
  cellRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  cellDate: { ...Typography.caption.regular, color: TextShade.c700 },
  cellTrip: { ...Typography.body2.regular, color: TextShade.c700, marginLeft: 5 },
  cellStatus: { ...Typography.body2.extraBold, marginLeft: 'auto' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: TextShade.c300,
    marginTop: 10,
  },
});
