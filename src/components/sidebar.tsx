/**
 * Port of lib/common/view/sidebar.dart.
 *
 * Flutter used a full-width Scaffold Drawer opened by a GlobalKey. Here it is
 * a full-screen modal: it looks identical (the Dart drawer was already
 * screenWidth wide), and it avoids adding a drawer navigator just to host one
 * menu that every screen opens the same way.
 *
 * The selected row is derived from the current route rather than stored in a
 * SidebarSelectionModel — the route is already the source of truth, and the
 * Dart copy could drift out of sync with it after a notification deep-link.
 */
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Images } from '@/core/constants/assets';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { useSession } from '@/core/session';
import { LocationTracker } from '@/core/services/location-tracker';
import { useAuthStore } from '@/features/auth/auth-store';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Destination = '/dashboard' | '/history' | '/profile';

export function Sidebar({ visible, onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);

  const [dialog, setDialog] = useState<'logout' | 'delete' | null>(null);

  const go = (destination: Destination) => {
    onClose();
    // Already there: just close, so tapping the current row is a no-op rather
    // than pushing a duplicate screen.
    if (pathname !== destination) router.replace(destination);
  };

  const handleLogout = async () => {
    setDialog(null);
    onClose();
    // Stop logging position — tracking must not outlive the session.
    void LocationTracker.stop();
    await useAuthStore.getState().logout();
    useAuthStore.getState().resetLogin();
    useAuthStore.getState().resetOtp();
    router.replace('/(auth)/login');
  };

  const handleDelete = async () => {
    setDialog(null);
    onClose();
    void LocationTracker.stop();
    await useAuthStore.getState().deleteAccount();
    useAuthStore.getState().resetLogin();
    useAuthStore.getState().resetOtp();
    router.replace('/(auth)/login');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <Image source={Images.avatar} style={styles.avatar} />
          <Pressable onPress={onClose} hitSlop={12}>
            <Image source={Images.close} style={styles.close} />
          </Pressable>
        </View>

        <Text style={styles.name}>{user?.name ?? ''}</Text>
        <Text style={styles.mobile}>
          {`+${Strings.commonCountryCode} ${user?.mobileNumber ?? ''}`}
        </Text>

        <View style={styles.divider} />

        <ScrollView style={styles.menu} contentContainerStyle={styles.menuContent}>
          <SidebarCell
            icon="home"
            title={Strings.sideBarHome}
            selected={pathname === '/dashboard'}
            onPress={() => go('/dashboard')}
          />
          <SidebarCell
            icon="bus"
            title={Strings.sideBarTripHistory}
            selected={pathname === '/history'}
            onPress={() => go('/history')}
          />
          <SidebarCell
            icon="person"
            title={Strings.sideBarProfile}
            selected={pathname === '/profile'}
            onPress={() => go('/profile')}
          />
          <SidebarCell
            icon="trash"
            title={Strings.sideBarDeleteAccount}
            selected={false}
            onPress={() => setDialog('delete')}
          />
        </ScrollView>

        <Pressable
          onPress={() => setDialog('logout')}
          style={[styles.logoutButton, { marginBottom: insets.bottom + 30 }]}
        >
          <Ionicons name="log-out-outline" size={20} color={AppColors.primary} />
          <Text style={styles.logoutText}>{Strings.logout}</Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={dialog === 'logout'}
        title={Strings.logout}
        message={Strings.areYouSureLogout}
        confirmLabel={Strings.logout}
        onConfirm={handleLogout}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title={Strings.deleteAccount}
        message={Strings.deleteAccountConfirm}
        confirmLabel={Strings.delete}
        onConfirm={handleDelete}
        onCancel={() => setDialog(null)}
      />
    </Modal>
  );
}

interface CellProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  selected: boolean;
  onPress: () => void;
}

function SidebarCell({ icon, title, selected, onPress }: CellProps) {
  const tint = selected ? AppColors.white : TextShade.c700;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.cell, selected && styles.cellSelected]}
    >
      <Ionicons name={icon} size={22} color={tint} />
      <Text style={[styles.cellText, { color: tint }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.white,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Primary.c300,
  },
  close: { width: 24, height: 24, resizeMode: 'contain' },
  name: { ...Typography.subtitle1.extraBold, color: AppColors.text, marginTop: 10 },
  mobile: { ...Typography.subtitle1.regular, color: TextShade.c700, marginTop: 5 },
  divider: { height: 1, backgroundColor: Primary.c300, marginTop: 20 },
  menu: { flex: 1, marginTop: 10 },
  menuContent: { paddingBottom: 10 },
  cell: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
  },
  cellSelected: { backgroundColor: AppColors.primary },
  cellText: { ...Typography.button2.extraBold, marginLeft: 10 },
  logoutButton: {
    height: 50,
    marginHorizontal: 20,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
  },
  logoutText: {
    ...Typography.button2.extraBold,
    color: AppColors.primary,
    marginLeft: 10,
  },
});
