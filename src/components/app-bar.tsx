/**
 * Ports the four Flutter app bars — common_appbar, dashboard_appbar,
 * notification_app_bar and trip_details_app_bar — which differed only in
 * leading icon, title content, background and trailing action.
 *
 * expo-router headers are disabled app-wide, so this renders as a normal view
 * at the top of each screen and handles its own top inset.
 */
import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, Primary } from '@/core/constants/colors';
import { Typography } from '@/core/constants/typography';

const TOOLBAR_HEIGHT = 56; // Flutter's kToolbarHeight.

interface Props {
  title?: string;
  /** Replaces the title text — used by the dashboard's duty switch. */
  titleContent?: ReactNode;
  /** 'menu' opens the drawer, 'back' pops. Omit for no leading button. */
  leading?: 'menu' | 'back';
  onLeadingPress?: () => void;
  /** Rendered at the trailing edge (bell, "clear all"). */
  actions?: ReactNode;
  /** Dashboard and the drawer screens use the tinted bar; details use white. */
  variant?: 'tinted' | 'white';
  centerTitle?: boolean;
}

export function AppBar({
  title,
  titleContent,
  leading,
  onLeadingPress,
  actions,
  variant = 'tinted',
  centerTitle = true,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          height: TOOLBAR_HEIGHT + insets.top,
          backgroundColor:
            variant === 'tinted' ? Primary.c100 : AppColors.white,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>
          {leading && (
            <Pressable onPress={onLeadingPress} hitSlop={8} style={styles.iconButton}>
              <Ionicons
                name={leading === 'menu' ? 'menu' : 'arrow-back'}
                size={24}
                color={AppColors.text}
              />
            </Pressable>
          )}
        </View>

        <View style={[styles.titleWrap, centerTitle ? styles.center : styles.left]}>
          {titleContent ?? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        <View style={[styles.side, styles.actions]}>{actions}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Flutter's elevation: 4.
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  // Equal-width gutters keep a centred title optically centred regardless of
  // how wide the trailing action is.
  side: { minWidth: 48, flexDirection: 'row', alignItems: 'center' },
  actions: { justifyContent: 'flex-end', paddingRight: 13 },
  iconButton: { padding: 12 },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  center: { justifyContent: 'center' },
  left: { justifyContent: 'flex-start' },
  title: { ...Typography.h4.extraBold, color: AppColors.text },
});
