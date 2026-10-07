/**
 * The driver's wallet: what each delivered tempo trip earned, what the office
 * has paid (cash or UPI, recorded in the admin panel), and what is still due.
 *
 * Nothing is worked out on the phone — the server sums the trips and payments,
 * so the driver and the admin always see the same three numbers.
 */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppBar } from '@/components/app-bar';
import { NotificationBell } from '@/components/notification-bell';
import { Sidebar } from '@/components/sidebar';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { WalletRepository } from '@/core/services/wallet-repository';
import { formatRupees } from '@/core/utils/number-format';
import { useNotificationStore } from '@/features/notification/notification-store';
import { isSuccess } from '@/types/api';
import type { Wallet, WalletPayment, WalletTrip } from '@/types/wallet';

type Tab = 'trips' | 'payments';

const isPayment = (item: WalletTrip | WalletPayment): item is WalletPayment => 'mode' in item;

export default function WalletScreen() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('trips');
  const notificationCount = useNotificationStore((s) => s.notificationCount);

  const load = useCallback(async () => {
    try {
      const response = await WalletRepository.getWallet();
      if (isSuccess(response) && response.data) {
        setWallet(response.data);
        setFailed(false);
      } else {
        setFailed(true);
      }
    } catch (e) {
      if (__DEV__) console.log('getWallet failed:', e);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
    void useNotificationStore.getState().getNotificationCount();
  }, [load]);

  const refresh = () => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  };

  const summary = wallet?.summary;
  const rows: (WalletTrip | WalletPayment)[] =
    tab === 'trips' ? (wallet?.trips ?? []) : (wallet?.payments ?? []);

  return (
    <View style={styles.screen}>
      <AppBar
        title={Strings.sideBarWallet}
        leading="menu"
        onLeadingPress={() => setDrawerOpen(true)}
        actions={
          <NotificationBell
            count={notificationCount}
            onPress={() => router.push('/notifications')}
          />
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      ) : failed && !wallet ? (
        <View style={styles.center}>
          <Text style={styles.empty}>{Strings.walletLoadFailed}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              void load().finally(() => setLoading(false));
            }}
            style={styles.retry}
          >
            <Text style={styles.retryText}>{Strings.walletRetry}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) =>
            (isPayment(item) ? item.id : item.tripId) ?? String(index)
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[AppColors.primary]}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>{Strings.walletBalance}</Text>
                <Text style={styles.cardBalance}>{formatRupees(summary?.balance ?? 0)}</Text>
                <View style={styles.cardRow}>
                  <Figure label={Strings.walletEarned} value={summary?.totalEarned ?? 0} />
                  <View style={styles.cardDivider} />
                  <Figure label={Strings.walletPaid} value={summary?.totalPaid ?? 0} />
                </View>
                <Text style={styles.cardTrips}>
                  {`${Strings.walletTrips}: ${summary?.tripCount ?? 0}`}
                </Text>
              </View>

              <View style={styles.tabs}>
                <TabButton
                  title={Strings.walletTabTrips}
                  active={tab === 'trips'}
                  onPress={() => setTab('trips')}
                />
                <TabButton
                  title={Strings.walletTabPayments}
                  active={tab === 'payments'}
                  onPress={() => setTab('payments')}
                />
              </View>
            </>
          }
          ListEmptyComponent={
            <Text style={styles.emptyRow}>
              {tab === 'trips' ? Strings.walletNoTrips : Strings.walletNoPayments}
            </Text>
          }
          renderItem={({ item }) =>
            isPayment(item) ? (
              <PaymentRow payment={item} />
            ) : (
              <TripRow trip={item} onPress={() => item.tripId && router.push(`/trip/${item.tripId}`)} />
            )
          }
        />
      )}

      <Sidebar visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={styles.figureValue}>{formatRupees(value)}</Text>
    </View>
  );
}

function TabButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
    </Pressable>
  );
}

function TripRow({ trip, onPress }: { trip: WalletTrip; onPress: () => void }) {
  const route = [trip.pickup, trip.delivery].filter(Boolean).join(' → ');
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>
          {`${Strings.trip}: #${trip.driverTripNumber ?? ''}`}
          {trip.orderNumber ? `  ·  ${trip.orderNumber}` : ''}
        </Text>
        {route ? <Text style={styles.rowSub} numberOfLines={2}>{route}</Text> : null}
        {trip.deliveredAt ? <Text style={styles.rowDate}>{trip.deliveredAt}</Text> : null}
      </View>
      <Text style={styles.rowAmountIn}>{`+${formatRupees(trip.amount)}`}</Text>
    </Pressable>
  );
}

function PaymentRow({ payment }: { payment: WalletPayment }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>
          {payment.mode === 'upi' ? Strings.walletModeUpi : Strings.walletModeCash}
        </Text>
        {payment.note ? <Text style={styles.rowSub}>{payment.note}</Text> : null}
        {payment.paidAt ? <Text style={styles.rowDate}>{payment.paidAt}</Text> : null}
      </View>
      <Text style={styles.rowAmountPaid}>{formatRupees(payment.amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { ...Typography.body1.regular, color: TextShade.c700, textAlign: 'center' },
  retry: {
    marginTop: 16,
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
  },
  retryText: { ...Typography.button2.extraBold, color: AppColors.white },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: AppColors.primary,
  },
  cardLabel: { ...Typography.body2.regular, color: Primary.c200 },
  cardBalance: { ...Typography.h2.extraBold, color: AppColors.white, marginTop: 4 },
  cardRow: {
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Primary.c700,
  },
  cardDivider: { width: StyleSheet.hairlineWidth, backgroundColor: Primary.c700, marginHorizontal: 12 },
  cardTrips: { ...Typography.caption.regular, color: Primary.c200, marginTop: 14 },
  figure: { flex: 1 },
  figureLabel: { ...Typography.caption.regular, color: Primary.c200 },
  figureValue: { ...Typography.subtitle1.extraBold, color: AppColors.white, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 6,
    padding: 4,
    borderRadius: 12,
    backgroundColor: Primary.c100,
  },
  tab: { flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: AppColors.white },
  tabText: { ...Typography.button2.extraBold, color: TextShade.c600 },
  tabTextActive: { color: AppColors.primary },
  emptyRow: { ...Typography.body2.regular, color: TextShade.c600, textAlign: 'center', marginTop: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TextShade.c300,
  },
  rowMain: { flex: 1, paddingRight: 12 },
  rowTitle: { ...Typography.subtitle2.extraBold, color: AppColors.text },
  rowSub: { ...Typography.body2.regular, color: TextShade.c700, marginTop: 3 },
  rowDate: { ...Typography.caption.regular, color: TextShade.c500, marginTop: 3 },
  rowAmountIn: { ...Typography.subtitle2.extraBold, color: AppColors.success500 },
  rowAmountPaid: { ...Typography.subtitle2.extraBold, color: AppColors.primary },
});
