/**
 * Port of lib/screens/notification/view/notification_screen.dart +
 * sub_view/{notification_app_bar,notification_cell}.dart.
 *
 * Each row is a card whose icon says what kind of notice it is — a new trip,
 * a weight change that re-priced a trip, or a wallet payment — grouped by day
 * like the trip lists.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { DayHeading, EmptyTrips, headingFor, timeOf } from '@/features/history/trip-card';
import { useNotificationStore } from '@/features/notification/notification-store';
import type { NotificationDoc } from '@/types/notification';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface Look {
  icon: IconName;
  color: string;
  background: string;
  heading: string;
}

function lookOf(item: NotificationDoc): Look {
  const heading = item.metadata?.notificationTitle;
  switch (item.metadata?.type) {
    case 'wallet-payment':
      return {
        icon: 'cash-check',
        color: AppColors.success500,
        background: AppColors.success50,
        heading: heading ?? '',
      };
    case 'trip-weight-changed':
      return {
        icon: 'scale-balance',
        color: '#B54708',
        background: '#FFFAEB',
        heading: heading ?? '',
      };
    default:
      return {
        icon: 'truck-plus-outline',
        color: AppColors.primary,
        background: Primary.c100,
        heading: heading ?? Strings.notificationNewTrip,
      };
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isLoading = useNotificationStore((s) => s.isLoading);
  const hasNextPage = useNotificationStore((s) => s.hasNextPage);
  const notifications = useNotificationStore((s) => s.notificationList);
  const unread = useNotificationStore((s) => s.notificationCount);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Start from a clean page 1 each visit, so a notification cleared or read
    // elsewhere is not shown stale from a previous session.
    useNotificationStore.getState().reset();
    void useNotificationStore.getState().getNotifications();
    void useNotificationStore.getState().getNotificationCount();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    useNotificationStore.getState().reset();
    await Promise.all([
      useNotificationStore.getState().getNotifications(),
      useNotificationStore.getState().getNotificationCount(),
    ]);
    setRefreshing(false);
  };

  const open = (item: NotificationDoc) => {
    if (!item.hasClicked && item.id) {
      void useNotificationStore.getState().markClicked(item.id);
    }
    if (item.metadata?.type === 'wallet-payment') {
      router.push('/wallet');
    } else if (item.tripId) {
      router.push(`/trip/${item.tripId}`);
    }
  };

  const isEmpty = !isLoading && !hasNextPage && notifications.length === 0;

  return (
    <View style={styles.screen}>
      <AppBar
        title={Strings.notification}
        leading="back"
        onLeadingPress={() => router.back()}
        variant="white"
        actions={
          unread > 0 ? (
            <Pressable
              onPress={() => void useNotificationStore.getState().clearAll()}
              hitSlop={8}
              style={({ pressed }) => [styles.clearAll, pressed && styles.clearAllPressed]}
            >
              <MaterialCommunityIcons name="check-all" size={16} color={AppColors.primary} />
              <Text style={styles.clearAllText}>{Strings.clearAll}</Text>
            </Pressable>
          ) : null
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item, index) => item.id ?? String(index)}
        contentContainerStyle={[styles.list, { paddingBottom: 24 + insets.bottom }]}
        onEndReached={() => void useNotificationStore.getState().getNotifications()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            colors={[AppColors.primary]}
            tintColor={AppColors.primary}
          />
        }
        ListEmptyComponent={
          isEmpty ? (
            <EmptyTrips icon="bell-sleep-outline" message={Strings.notificationsEmpty} />
          ) : isLoading && !refreshing ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={AppColors.primary} />
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoading && notifications.length > 0 ? (
            <View style={styles.footer}>
              <ActivityIndicator color={AppColors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const heading = headingFor(notifications, index, (n) => n.createdAtIso);
          return (
            <>
              {heading ? <DayHeading label={heading} /> : null}
              <NotificationCard item={item} onPress={() => open(item)} />
            </>
          );
        }}
      />
    </View>
  );
}

function NotificationCard({ item, onPress }: { item: NotificationDoc; onPress: () => void }) {
  const look = lookOf(item);
  const unread = !item.hasClicked;
  const time = timeOf(item.createdAtIso) ?? item.createdAt;
  const tappable = item.metadata?.type === 'wallet-payment' || !!item.tripId;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        unread && styles.cardUnread,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.iconTile, { backgroundColor: look.background }]}>
        <MaterialCommunityIcons name={look.icon} size={22} color={look.color} />
      </View>

      <View style={styles.content}>
        <View style={styles.headRow}>
          <Text
            style={[styles.heading, !unread && styles.headingRead]}
            numberOfLines={1}
          >
            {look.heading}
          </Text>
          {unread ? (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>{Strings.notificationNew}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.body, unread && styles.bodyUnread]}>{item.title ?? ''}</Text>
        <View style={styles.footRow}>
          <MaterialCommunityIcons name="clock-outline" size={13} color={TextShade.c500} />
          <Text style={styles.time}>{time ?? ''}</Text>
          {item.metadata?.driverTripNumber != null ? (
            <Text style={styles.tripTag}>
              {`${Strings.trip} #${item.metadata.driverTripNumber}`}
            </Text>
          ) : null}
        </View>
      </View>

      {tappable ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={TextShade.c400}
          style={styles.chevron}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9FA' },
  clearAll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Primary.c100,
  },
  clearAllPressed: { backgroundColor: Primary.c200 },
  clearAllText: { ...Typography.caption.extraBold, color: AppColors.primary, marginLeft: 4 },
  list: { paddingHorizontal: 12, paddingTop: 4, flexGrow: 1 },
  center: { paddingVertical: 48, alignItems: 'center' },
  footer: { padding: 16, alignItems: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: AppColors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TextShade.c100,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardUnread: {
    backgroundColor: '#F2F8F7',
    borderColor: Primary.c300,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.primary,
  },
  cardPressed: { backgroundColor: AppColors.secondary100 },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  heading: { ...Typography.subtitle2.extraBold, color: AppColors.text, flexShrink: 1 },
  headingRead: { color: TextShade.c800 },
  newPill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: AppColors.primary,
  },
  newPillText: { ...Typography.overline2.extraBold, color: AppColors.white, letterSpacing: 0.5 },
  body: { ...Typography.body2.regular, color: TextShade.c700, marginTop: 4, lineHeight: 20 },
  bodyUnread: { color: TextShade.c900 },
  footRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  time: { ...Typography.caption.regular, color: TextShade.c500, marginLeft: 4 },
  tripTag: {
    ...Typography.caption.extraBold,
    color: AppColors.primary,
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: Primary.c100,
    overflow: 'hidden',
  },
  chevron: { alignSelf: 'center', marginLeft: 4 },
});
