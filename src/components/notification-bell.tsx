/** Port of lib/common/view/notification_bell_view.dart. */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/core/constants/colors';
import { Typography } from '@/core/constants/typography';

interface Props {
  count: number;
  onPress: () => void;
}

export function NotificationBell({ count, onPress }: Props) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <View>
        <Ionicons name="notifications-outline" size={26} color={AppColors.text} />
        {count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -3,
    top: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: AppColors.notificationBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...Typography.overline1.bold,
    color: AppColors.white,
    textAlign: 'center',
    // The 1.5 letterSpacing from overline1 pushes a centred glyph off-centre
    // inside a circle; zero it here only.
    letterSpacing: 0,
  },
});
