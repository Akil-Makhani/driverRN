/**
 * Port of lib/screens/profile/view/profile_screen.dart +
 * sub_view/profile_view.dart.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Sidebar } from '@/components/sidebar';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { useSession } from '@/core/session';
import { useAuthStore } from '@/features/auth/auth-store';

export default function ProfileScreen() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const user = useSession((s) => s.user);

  const handleLogout = async () => {
    setLogoutOpen(false);
    await useAuthStore.getState().logout();
    useAuthStore.getState().resetLogin();
    useAuthStore.getState().resetOtp();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.screen}>
      <AppBar
        title={Strings.sideBarProfile}
        leading="menu"
        onLeadingPress={() => setDrawerOpen(true)}
      />

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsOf(user?.name ?? '')}</Text>
            </View>
            <Text style={styles.name}>{user?.name ?? ''}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Field
              label={Strings.mobileNumber}
              value={`+${Strings.commonCountryCode} ${user?.mobileNumber ?? ''}`}
            />
            <View style={styles.fieldGap} />
            <Field
              label={Strings.aadharNumber}
              value={formatAadhar(user?.adharNumber ?? '')}
            />
          </View>

          <View style={styles.singleField}>
            <Field label={Strings.panNumber} value={user?.panNumber ?? ''} />
          </View>
        </View>

        <Pressable onPress={() => setLogoutOpen(true)} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{Strings.logout.toUpperCase()}</Text>
        </Pressable>
      </View>

      <Sidebar visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <ConfirmDialog
        visible={logoutOpen}
        title={Strings.logout}
        message={Strings.areYouSureLogout}
        confirmLabel={Strings.logout}
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

/** "1234-5678-9012" — groups of four, as profile_view.dart did. */
function formatAadhar(aadhar: string): string {
  return aadhar.replace(/[^0-9]/g, '').replace(/(\d{4})(?=\d)/g, '$1-');
}

/** First letters of the first two words, uppercased. */
function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  body: { flex: 1, padding: 15 },
  card: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.h4.extraBold, color: AppColors.primary },
  name: {
    ...Typography.h4.extraBold,
    color: AppColors.text,
    flex: 1,
    marginLeft: 15,
  },
  fieldRow: { flexDirection: 'row', marginTop: 15 },
  fieldGap: { width: 20 },
  singleField: { marginTop: 15 },
  field: { flex: 1 },
  fieldLabel: { ...Typography.body2.semiBold, color: TextShade.c700 },
  fieldValue: {
    ...Typography.body2.extraBold,
    color: AppColors.text,
    marginTop: 3,
  },
  logoutButton: {
    marginTop: 15,
    padding: 15,
    borderRadius: 10,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
  },
  logoutText: { ...Typography.button2.extraBold, color: AppColors.white },
});
