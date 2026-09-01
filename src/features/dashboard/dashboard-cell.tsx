/** Port of lib/screens/dashboard/sub_view/dashboard_cell.dart. */
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { AppColors, GreenGradient, Primary, TextShade } from '@/core/constants/colors';
import { TripStatusNumber } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { RouteButton } from '@/features/dashboard/route-button';
import type { TripItem } from '@/types/trip';

interface Props {
  trip: TripItem;
  onPress: () => void;
  onAcceptPress: () => void;
}

export function DashboardCell({ trip, onPress, onAcceptPress }: Props) {
  const isAccepted = trip.statusNumber !== TripStatusNumber.assigned;

  return (
    <Pressable onPress={onPress}>
      <View style={styles.spacer} />
      <View style={styles.divider} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.weightPill}>
            <Text style={styles.weightText}>
              {`${Math.trunc(trip.totalWeight ?? 0)}${Strings.kg}`}
            </Text>
          </View>
          <View style={styles.tempo}>
            <Image source={Images.truck} style={styles.truckIcon} />
            <Text style={styles.tempoText}>{trip.tempoNumber ?? ''}</Text>
            <RouteButton tripId={trip.id ?? ''} />
          </View>
        </View>

        <Text style={styles.address}>
          {`#${trip.driverTripNumber ?? ''}${trip.pickupAddress ?? ''}`}
        </Text>

        <View style={styles.numbersRow}>
          <View style={styles.numberBlock}>
            <Text style={styles.numberLabel}>{Strings.truckNumber}</Text>
            <Text style={styles.numberValue}>{trip.truckNumber ?? ''}</Text>
          </View>
          <View style={[styles.numberBlock, styles.numberBlockSpaced]}>
            <Text style={styles.numberLabel}>{Strings.lrNumber}</Text>
            <Text style={styles.numberValue}>{trip.lrNumber ?? ''}</Text>
          </View>
        </View>

        {isAccepted ? (
          <LinearGradient
            colors={GreenGradient.colors}
            locations={GreenGradient.locations}
            start={GreenGradient.start}
            end={GreenGradient.end}
            style={styles.statusBar}
          >
            <Text style={styles.statusLabel}>{Strings.tripInProcess}</Text>
            <Text style={styles.statusValue}>{Strings.accepted}</Text>
          </LinearGradient>
        ) : (
          <Pressable onPress={onAcceptPress} style={styles.acceptButton}>
            <Text style={styles.acceptText}>{Strings.acceptTrip}</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  spacer: { height: 10 },
  divider: { height: 10, backgroundColor: Primary.c100 },
  body: { paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  weightPill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
  },
  weightText: { ...Typography.body1.extraBold, color: AppColors.white },
  tempo: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  truckIcon: { height: 25, width: 34, resizeMode: 'contain' },
  tempoText: { ...Typography.body1.extraBold, color: AppColors.text, marginLeft: 5 },
  address: { ...Typography.subtitle1.extraBold, color: AppColors.text, marginTop: 5 },
  numbersRow: { flexDirection: 'row', marginTop: 10 },
  numberBlock: { paddingLeft: 3 },
  numberBlockSpaced: { marginLeft: 10 },
  numberLabel: { ...Typography.body2.semiBold, color: TextShade.c700 },
  numberValue: {
    ...Typography.subtitle2.extraBold,
    color: AppColors.text,
    marginTop: 2,
  },
  statusBar: {
    height: 42,
    marginTop: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: { ...Typography.body1.bold, color: AppColors.text },
  statusValue: { ...Typography.body1.extraBold, color: AppColors.primary },
  acceptButton: {
    height: 42,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { ...Typography.button2.extraBold, color: AppColors.primary },
});
