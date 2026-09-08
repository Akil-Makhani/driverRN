/**
 * The home screen of a driver who is waiting for the admin.
 *
 * Submitting the form used to end at a popup and a trip back to the login
 * screen, which left the driver holding nothing: no record of what they had
 * sent, and a LOG IN button that would not let them in. So this is the app for
 * a pending driver — deliberately shaped like the dashboard they are waiting
 * to be let into, with their own name in the same card the dashboard puts it
 * in, and the approval standing where the trip list would be.
 *
 * A decision can arrive while the driver is sitting here — as a push (the root
 * layout hands it to the store), or as the answer to one of the checks below —
 * and it always arrives as a popup over this screen, never as a change to it.
 * Approval opens the app, rejection returns to login, so the screen underneath
 * has nothing to become and deliberately stays exactly as it was while the
 * driver reads the popup.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/app-bar';
import { Images } from '@/core/constants/assets';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { formatTimestamp } from '@/core/utils/date-format';
import { groupDigits } from '@/core/utils/number-format';
import { useAuthStore } from '@/features/auth/auth-store';
import { useRegistrationStore } from '@/features/auth/registration-store';

/** A check this recent is not worth repeating when the screen is re-entered. */
const RECHECK_AFTER_MS = 10_000;

/**
 * This screen only ever says one thing, and deliberately keeps saying it while
 * a decision popup is open over it. It used to restyle itself the moment an
 * answer arrived — circle recoloured, words swapped, buttons removed — all
 * behind a modal the driver was still reading, which read as the screen
 * glitching. Every decision now leaves for somewhere else, so there is nothing
 * for this to become.
 */
const LOOK = {
  circle: Strings.pendingCircleWaiting,
  wash: TextShade.c100,
  tint: TextShade.c400,
} as const;

export default function PendingApprovalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pendingMobile = useRegistrationStore((s) => s.pendingMobile);
  const statusInfo = useRegistrationStore((s) => s.statusInfo);
  const isChecking = useRegistrationStore((s) => s.isCheckingStatus);
  const checkFailed = useRegistrationStore((s) => s.checkFailed);
  // Only ever true here while the approval is being traded for a session,
  // which happens after the popup has closed and so is worth covering.
  const isEntering = useAuthStore((s) => s.isLoading);


  // Stable, because the hardware-back effect below depends on it and must not
  // re-subscribe on every render.
  const goToLogin = useCallback(() => {
    useRegistrationStore.getState().dismissOutcome();
    router.replace('/(auth)/login');
  }, [router]);

  const check = () => {
    const { pendingMobile: mobile, isCheckingStatus } = useRegistrationStore.getState();
    if (!mobile || isCheckingStatus) return;
    void useRegistrationStore.getState().checkStatusFor(mobile);
  };

  // Asks once on arrival, then again whenever the app is brought back to the
  // front — the two moments a driver is actually looking for an answer. There
  // is no poll on a timer: the decision arrives as a push, and a screen that
  // may be open for hours should not keep asking on the driver's data.
  const checked = useRef(false);
  useEffect(() => {
    if (!checked.current) {
      checked.current = true;
      const { lastCheckedAt } = useRegistrationStore.getState();
      if (lastCheckedAt == null || Date.now() - lastCheckedAt > RECHECK_AFTER_MS) check();
    }

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // Only while a decision is still out. Re-asking about a decided
      // registration would raise its popup again every time the driver
      // switches back to the app.
      if ((useRegistrationStore.getState().statusInfo?.status ?? 'Pending') === 'Pending') {
        check();
      }
    });
    return () => sub.remove();
  }, []);

  // Hardware back would otherwise walk back into the OTP screen and the form
  // the driver has just submitted. Login is the only sensible way out.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goToLogin();
      return true;
    });
    return () => sub.remove();
  }, [goToLogin]);

  const rows: [string, string | undefined][] = [
    [Strings.pendingVehicle, statusInfo?.vehicleNumber],
    [Strings.pendingLicence, statusInfo?.driverLicenceNumber],
    [Strings.pendingSubmittedAt, formatTimestamp(statusInfo?.submittedAt)],
  ];
  const filled = rows.filter(([, v]) => v != null && v !== '');

  return (
    <View style={styles.screen}>
      <AppBar title={Strings.registerWaitingTitle} leading="back" onLeadingPress={goToLogin} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isChecking}
            onRefresh={check}
            colors={[AppColors.primary]}
            tintColor={AppColors.primary}
          />
        }
      >
        {/* Deliberately the dashboard's own driver card, down to the borders:
            this is the app the driver is being let into, and seeing their name
            in the place it will live is most of what makes the wait feel like
            being inside it rather than shut out of it. Written out here rather
            than imported, because DashboardTopView reads the logged-in session
            and a driver waiting for approval does not have one. */}
        <View style={styles.driverCard}>
          <Image source={Images.avatar} style={styles.avatar} />
          <View style={styles.driverText}>
            <Text style={styles.driverName} numberOfLines={1}>
              {statusInfo?.driverName ?? ''}
            </Text>
            {pendingMobile ? (
              <Text style={styles.driverMobile}>
                {`+${Strings.commonCountryCode} ${groupDigits(pendingMobile)}`}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Standing where the trip list would be, in the circle the dashboard
            uses to say there is nothing there yet. */}
        <View style={[styles.circle, { backgroundColor: LOOK.wash }]}>
          <Text style={[styles.circleText, { color: LOOK.tint }]}>{LOOK.circle}</Text>
        </View>

        <Text style={styles.body}>{Strings.pendingBody}</Text>

        {filled.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{Strings.pendingSubmittedTitle}</Text>
            {filled.map(([label, value]) => (
              <View key={label} style={styles.cardRow}>
                <Text style={styles.cardLabel}>{label}</Text>
                <Text style={styles.cardValue} numberOfLines={2}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.noteRow}>
          <Ionicons
            name="notifications-outline"
            size={18}
            color={AppColors.primary}
            style={styles.noteIcon}
          />
          <Text style={styles.note}>{Strings.pendingNotifyNote}</Text>
        </View>

        {checkFailed ? (
          <Text style={styles.failed}>{Strings.pendingCheckFailed}</Text>
        ) : null}

        {/* The only button worth offering while waiting. Logging in is not an
            alternative to waiting — it is the thing the driver cannot do yet —
            so it is left to the back arrow rather than dressed up as a choice
            down here. */}
        <Pressable onPress={check} disabled={isChecking} style={styles.button}>
          {isChecking ? (
            <ActivityIndicator size="small" color={AppColors.white} />
          ) : (
            <Text style={styles.buttonText}>{Strings.pendingCheckStatus}</Text>
          )}
        </Pressable>
      </ScrollView>

      {isEntering && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.white },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 10 },

  // dashboard-parts.tsx's topView / topAvatar / topName, kept in step.
  driverCard: {
    height: 92,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: Primary.c300,
    resizeMode: 'cover',
  },
  driverText: { marginLeft: 15, justifyContent: 'center', flex: 1 },
  driverName: { ...Typography.h4.extraBold, color: AppColors.text },
  driverMobile: { ...Typography.body1.regular, color: AppColors.text, marginTop: 5 },

  // dashboard-parts.tsx's emptyCircle, at the smaller of the two sizes it can
  // take: here it has the details and the actions below it to share with.
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginTop: 28,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: { ...Typography.h3.extraBold, textAlign: 'center' },

  body: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    alignSelf: 'stretch',
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: AppColors.secondary100,
  },
  cardTitle: { ...Typography.caption.extraBold, color: AppColors.primary },
  cardRow: { flexDirection: 'row', marginTop: 10 },
  cardLabel: { ...Typography.body2.regular, color: TextShade.c700, width: 90 },
  cardValue: { ...Typography.body2.bold, color: AppColors.text, flex: 1 },

  noteRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 18 },
  noteIcon: { marginTop: 1, marginRight: 8 },
  note: { ...Typography.caption.regular, color: TextShade.c600, flex: 1, lineHeight: 18 },
  failed: {
    ...Typography.body2.regular,
    color: AppColors.error600,
    marginTop: 14,
    textAlign: 'center',
  },

  button: {
    alignSelf: 'stretch',
    marginTop: 22,
    height: 50,
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { ...Typography.button2.extraBold, color: AppColors.white },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
