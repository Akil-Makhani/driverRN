/**
 * A strip across the top of every screen while the network is bad.
 *
 * Shown from the API calls' own outcomes (see core/network-status), so it says
 * "slow" as soon as a call has been waiting a few seconds, and "no internet"
 * when one could not get through. While it is up it re-checks the server every
 * few seconds and takes itself down once a call gets through quickly again —
 * otherwise a driver who never tapped anything would keep seeing it after the
 * signal came back.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { checkConnection } from '@/core/api/api-service';
import { AppColors } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { useNetworkStatus } from '@/core/network-status';

const RECHECK_MS = 5000;

/**
 * One check at a time across every mounted banner (the offer card draws its
 * own): on a slow network each check can outlast the interval, and piling
 * them up only makes the network slower.
 */
let checking = false;

export function NetworkBanner() {
  const status = useNetworkStatus((s) => s.status);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (status === 'ok') return;
    const id = setInterval(() => {
      if (checking) return;
      checking = true;
      void checkConnection().finally(() => {
        checking = false;
      });
    }, RECHECK_MS);
    return () => clearInterval(id);
  }, [status]);

  if (status === 'ok') return null;

  const offline = status === 'offline';
  return (
    <View
      pointerEvents="none"
      style={[
        styles.banner,
        { paddingTop: insets.top + 6 },
        offline ? styles.offline : styles.slow,
      ]}
    >
      <MaterialCommunityIcons
        name={offline ? 'wifi-off' : 'wifi-strength-1-alert'}
        size={18}
        color={AppColors.white}
      />
      <Text style={styles.text} numberOfLines={1}>
        {offline ? Strings.networkOfflineBanner : Strings.networkSlowBanner}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 6,
    paddingHorizontal: 16,
  },
  offline: { backgroundColor: AppColors.error500 },
  slow: { backgroundColor: '#DC6803' },
  text: { ...Typography.body2.extraBold, color: AppColors.white },
});
