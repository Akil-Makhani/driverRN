/**
 * Asks a Tiles Drop driver for the registration details they left out (name,
 * licence, date of birth, document photos), using the profile's
 * `detailsStatus`:
 *
 *   - Before the admin's trip limit: a banner on the dashboard, saying how
 *     many trips are left, that opens "Complete your details".
 *   - Past it: no new trips are offered (the server stops sending them), so a
 *     sheet that cannot be dismissed says so and leads to the same screen.
 *     Not while a trip is in hand: a driver mid-delivery must be able to
 *     finish it first.
 *
 * Renders nothing for a driver whose details are complete, and for own
 * drivers, whose profile carries no detailsStatus.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { localDigits } from '@/core/i18n/language';
import { useSession } from '@/core/session';

export function DetailsReminder({ hasTrips }: { hasTrips: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const status = useSession((s) => s.user?.detailsStatus);

  // A Modal draws over every screen, so it must close while another screen
  // (Complete your details itself) is on top of the dashboard.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  if (!status || status.complete) return null;

  const open = () => router.push('/complete-details');

  const bannerText =
    status.tripsLeft != null
      ? Strings.detailsBannerTripsLeft.replace('{count}', localDigits(String(status.tripsLeft)))
      : Strings.detailsBannerNoLimit;

  return (
    <>
      <Pressable
        onPress={open}
        style={[styles.banner, status.blocked ? styles.bannerBlocked : null]}
        android_ripple={{ color: Primary.c100 }}
      >
        <View style={[styles.bannerIcon, status.blocked ? styles.bannerIconBlocked : null]}>
          <Ionicons name={status.blocked ? 'alert' : 'document-text'} size={18} color={AppColors.white} />
        </View>
        <View style={styles.bannerBody}>
          <Text style={styles.bannerTitle}>
            {status.blocked ? Strings.detailsBlockedTitle : Strings.detailsBannerTitle}
          </Text>
          <Text style={styles.bannerText} numberOfLines={3}>
            {status.blocked
              ? Strings.detailsBlockedBody.replace('{count}', localDigits(String(status.completedTrips)))
              : bannerText}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={status.blocked ? AppColors.error600 : AppColors.primary} />
      </Pressable>

      <Modal
        visible={status.blocked && !hasTrips && focused}
        transparent
        animationType="fade"
        // Back does not dismiss it: there is nothing for the driver here
        // until the details are in.
        onRequestClose={() => {}}
        statusBarTranslucent
      >
        <View style={styles.scrim}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetIcon}>
              <Ionicons name="id-card" size={30} color={AppColors.white} />
            </View>
            <Text style={styles.sheetTitle}>{Strings.detailsBlockedTitle}</Text>
            <Text style={styles.sheetBody}>
              {Strings.detailsBlockedBody.replace('{count}', localDigits(String(status.completedTrips)))}
            </Text>
            <Pressable onPress={open} style={styles.sheetButton}>
              <Text style={styles.sheetButtonText}>{Strings.detailsBlockedAction}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 10,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: AppColors.secondary100,
  },
  bannerBlocked: { borderColor: AppColors.error500, backgroundColor: '#FEF3F2' },
  bannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIconBlocked: { backgroundColor: AppColors.error600 },
  bannerBody: { flex: 1 },
  bannerTitle: { ...Typography.body2.bold, color: AppColors.text },
  bannerText: { ...Typography.caption.regular, color: TextShade.c700, marginTop: 2 },

  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 24,
    alignItems: 'center',
  },
  sheetIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: AppColors.error600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { ...Typography.h4.extraBold, color: AppColors.text, marginTop: 14, textAlign: 'center' },
  sheetBody: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 21,
  },
  sheetButton: {
    alignSelf: 'stretch',
    marginTop: 20,
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  sheetButtonText: { ...Typography.button2.extraBold, color: AppColors.white },
});
