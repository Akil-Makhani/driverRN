/**
 * Port of lib/screens/notification/view/notification_screen.dart +
 * sub_view/{notification_app_bar,notification_cell}.dart.
 */
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Images } from '@/core/constants/assets';
import { AppColors, Primary } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { useNotificationStore } from '@/features/notification/notification-store';
import type { NotificationDoc } from '@/types/notification';

export default function NotificationsScreen() {
  const router = useRouter();
  const isLoading = useNotificationStore((s) => s.isLoading);
  const notifications = useNotificationStore((s) => s.notificationList);

  useEffect(() => {
    // Start from a clean page 1 each visit, so a notification cleared or read
    // elsewhere is not shown stale from a previous session.
    useNotificationStore.getState().reset();
    void useNotificationStore.getState().getNotifications();
  }, []);

  const openTrip = (item: NotificationDoc) => {
    if (!item.tripId) return;
    if (!item.hasClicked && item.id) {
      void useNotificationStore.getState().markClicked(item.id);
    }
    router.push(`/trip/${item.tripId}`);
  };

  return (
    <View style={styles.screen}>
      <AppBar
        title={Strings.notification}
        leading="back"
        onLeadingPress={() => router.back()}
        variant="white"
        actions={
          <Pressable
            onPress={() => void useNotificationStore.getState().clearAll()}
            hitSlop={8}
          >
            <Image source={Images.clearAll} style={styles.clearAll} />
          </Pressable>
        }
      />

      <View style={styles.topDivider} />

      {isLoading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, index) => item.id ?? String(index)}
          onEndReached={() => void useNotificationStore.getState().getNotifications()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.footer}>
                <ActivityIndicator color={AppColors.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openTrip(item)}
              // Unread rows carry the pale tint.
              style={item.hasClicked ? styles.rowRead : styles.rowUnread}
            >
              <View style={styles.cell}>
                <Text style={styles.cellTitle}>{item.title ?? ''}</Text>
                <Text style={styles.cellDate}>{item.createdAt ?? ''}</Text>
              </View>
              <View style={styles.divider} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  clearAll: { width: 70, height: 24, resizeMode: 'contain' },
  topDivider: { height: 2, backgroundColor: Primary.c300 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 16, alignItems: 'center' },
  rowRead: { backgroundColor: AppColors.white },
  rowUnread: { backgroundColor: AppColors.secondary100 },
  cell: { paddingVertical: 15, paddingHorizontal: 20 },
  cellTitle: { ...Typography.body2.regular, color: AppColors.text },
  cellDate: { ...Typography.body2.regular, color: AppColors.primary },
  divider: { height: 2, backgroundColor: Primary.c300 },
});
