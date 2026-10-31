/** Port of lib/screens/dashboard/sub_view/dashboard_cell.dart. */
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { AppColors, GreenGradient, Primary, TextShade } from '@/core/constants/colors';
import { TripStatusNumber } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { formatRupees } from '@/core/utils/number-format';
import { RouteButton } from '@/features/dashboard/route-button';
import type { TripItem } from '@/types/trip';

interface Props {
  trip: TripItem;
  onPress: () => void;
  onAcceptPress: () => void;
}

/** The stage shown on the card's status bar once the trip is accepted. */
function stageLabel(trip: TripItem): string {
  switch (trip.statusNumber) {
    case TripStatusNumber.pickup:
      return Strings.vehicleThereStatus;
    case TripStatusNumber.inTransit:
      return trip.reachedAt ? Strings.confirmReachedLabel : Strings.inTransitStatus;
    default:
      return Strings.accepted;
  }
}

export function DashboardCell({ trip, onPress, onAcceptPress }: Props) {
  const isAccepted = trip.statusNumber !== TripStatusNumber.assigned;
  // A tempo trip's number is already in the row below; repeating it up here
  // pushed it off the edge of the card next to the earning.
  const extraTempoNumber = trip.orderKind === 'tempo' ? null : trip.tempoNumber;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.weightPill}>
          <Text style={styles.weightText}>
            {`${Math.trunc(trip.totalWeight ?? 0)}${Strings.kg}`}
          </Text>
        </View>
        {/* What the trip pays, next to its weight. A hand-assigned trip
            carries no fare and shows nothing here. */}
        {trip.driverPayout != null && (
          <View style={styles.earningPill}>
            <Text style={styles.earningText}>
              {`${Strings.tripEarning} ${Strings.rupeesSign}${formatRupees(trip.driverPayout)}`}
            </Text>
          </View>
        )}
        <View style={styles.tempo}>
          <Image source={Images.truck} style={styles.truckIcon} />
          {extraTempoNumber ? <Text style={styles.tempoText}>{extraTempoNumber}</Text> : null}
          <RouteButton tripId={trip.id ?? ''} />
        </View>
      </View>

      <View style={styles.addressRow}>
        <Text style={styles.tripNumber}>{`#${trip.driverTripNumber ?? ''}`}</Text>
        <Text style={styles.address}>{trip.pickupAddress ?? ''}</Text>
      </View>

      <View style={styles.numbersRow}>
        {/* A tempo trip is driven in a tempo, so it is labelled with the
            tempo's number; "Truck Number" there read as the wrong vehicle. */}
        <View style={styles.numberBlock}>
          <Text style={styles.numberLabel}>
            {trip.orderKind === 'tempo' ? Strings.tempoNumber : Strings.truckNumber}
          </Text>
          <Text style={styles.numberValue}>
            {(trip.orderKind === 'tempo' ? trip.tempoNumber : trip.truckNumber) ?? ''}
          </Text>
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
          <Text style={styles.statusValue}>{stageLabel(trip)}</Text>
        </LinearGradient>
      ) : (
        <Pressable onPress={onAcceptPress} style={styles.acceptButton}>
          <Text style={styles.acceptText}>{Strings.acceptTrip}</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 10,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: AppColors.white,
  },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  weightPill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
  },
  weightText: { ...Typography.body1.extraBold, color: AppColors.white },
  earningPill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: AppColors.success300,
    backgroundColor: AppColors.success50,
    justifyContent: 'center',
  },
  earningText: { ...Typography.body1.extraBold, color: AppColors.success500 },
  tempo: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  truckIcon: { height: 25, width: 34, resizeMode: 'contain' },
  tempoText: { ...Typography.body1.extraBold, color: AppColors.text, marginLeft: 5 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  tripNumber: { ...Typography.subtitle2.extraBold, color: AppColors.primary, marginRight: 6 },
  address: { ...Typography.subtitle2.extraBold, color: AppColors.text, flex: 1 },
  numbersRow: { flexDirection: 'row', marginTop: 10 },
  numberBlock: { flex: 1 },
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
