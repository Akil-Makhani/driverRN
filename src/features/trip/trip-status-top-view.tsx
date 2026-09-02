/** Port of lib/screens/trip_detail/subview/trip_status_top_view.dart. */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { AppColors, TextShade } from '@/core/constants/colors';
import { TripStatusNumber } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';

/** The green banner explaining what the driver should do next. */
export function TripStatusTopView({
  status,
  onKnowMorePress,
}: {
  status: number;
  /** Opens the fuller explanation. Flutter drew this as a dead image. */
  onKnowMorePress?: () => void;
}) {
  const { title, subtitle } = copyFor(status);

  return (
    <View style={styles.container}>
      <Image source={Images.greenTruck} style={styles.truck} />
      <View style={styles.textColumn}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            onPress={onKnowMorePress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={Strings.knowMore}
          >
            <Image source={Images.knowMore} style={styles.knowMore} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function copyFor(status: number): { title: string; subtitle: string } {
  switch (status) {
    case TripStatusNumber.assigned:
      return { title: Strings.acceptTrip, subtitle: Strings.acceptTripDesc };
    case TripStatusNumber.accepted:
      return { title: Strings.pickupOrder, subtitle: Strings.pickupOrderDesc };
    case TripStatusNumber.pickup:
      return { title: Strings.inTransit, subtitle: Strings.inTransitDesc };
    case TripStatusNumber.inTransit:
      return { title: Strings.inTransit, subtitle: Strings.inTransitDesc2 };
    case TripStatusNumber.delivered:
      return {
        title: Strings.successfullyDelivered,
        subtitle: Strings.successfullyDeliveredDesc,
      };
    default:
      return { title: '', subtitle: '' };
  }
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: AppColors.success300,
    backgroundColor: AppColors.success50,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  truck: { width: 64, height: 64, resizeMode: 'contain' },
  textColumn: { flex: 1, marginLeft: 12 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...Typography.body1.extraBold, color: AppColors.text, flex: 1 },
  knowMore: { width: 80, height: 24, resizeMode: 'contain' },
  subtitle: { ...Typography.body2.regular, color: TextShade.c800, marginTop: 2 },
});
