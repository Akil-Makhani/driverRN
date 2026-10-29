/**
 * What the trip pays the driver, pinned above the trip screen's scroll.
 *
 * The API re-prices it when the loaded or delivered weight differs from the
 * order, so it can move after Confirm Loading or Delivered; the amount the
 * offer showed is then struck through under it.
 */
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { formatRupees } from '@/core/utils/number-format';
import type { TripDetailsData } from '@/types/trip';

export function TripEarningCard({ details }: { details: TripDetailsData | null }) {
  const payout = details?.driverPayout;
  // A hand-assigned trip carries no fare.
  if (payout == null) return null;

  const was = details?.offeredPayout;
  const changed = was != null && was !== payout;

  return (
    <View style={styles.bar}>
      <View style={styles.card}>
        <Ionicons name="wallet-outline" size={22} color={AppColors.success500} />
        <View style={styles.labels}>
          <Text style={styles.label}>{Strings.tripEarning}</Text>
          {changed && (
            <Text style={styles.note} numberOfLines={1}>
              {Strings.tripEarningChanged}
            </Text>
          )}
        </View>
        <View style={styles.amounts}>
          <Text style={styles.amount}>{`${Strings.rupeesSign}${formatRupees(payout)}`}</Text>
          {changed && (
            <Text style={styles.was}>
              {`${Strings.tripEarningWas} `}
              <Text style={styles.wasAmount}>{`${Strings.rupeesSign}${formatRupees(was)}`}</Text>
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // White behind the card, so scrolled content does not show around it.
  bar: { backgroundColor: AppColors.white, paddingHorizontal: 15, paddingVertical: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.success300,
    backgroundColor: AppColors.success50,
  },
  labels: { flex: 1, marginLeft: 10 },
  label: { ...Typography.body1.bold, color: AppColors.text },
  note: { ...Typography.body2.medium, color: TextShade.c700, marginTop: 1 },
  amounts: { alignItems: 'flex-end', marginLeft: 10 },
  amount: { ...Typography.h4.extraBold, color: AppColors.success500 },
  was: { ...Typography.body2.semiBold, color: TextShade.c700 },
  wasAmount: { textDecorationLine: 'line-through' },
});
