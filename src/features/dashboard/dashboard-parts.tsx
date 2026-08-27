/**
 * Ports the three smaller dashboard sub-views:
 *   dashboard_deliver_all_cell.dart, dashboard_top_view.dart,
 *   dashboard_emptyview.dart.
 */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography, textSize50ExtraBold } from '@/core/constants/typography';
import { useSession } from '@/core/session';
import type { TripItem } from '@/types/trip';

/** The batch "DELIVER ALL" card shown above the list when trips are in transit. */
export function DeliverAllCell({
  trips,
  onPress,
}: {
  trips: TripItem[];
  onPress: () => void;
}) {
  return (
    <View>
      <View style={styles.spacer} />
      <View style={styles.divider} />
      <View style={styles.deliverBody}>
        {trips.map((trip) => (
          <Text key={trip.id} style={styles.deliverAddress}>
            {`#${trip.driverTripNumber ?? ''}${trip.pickupAddress ?? ''}`}
          </Text>
        ))}
        <Pressable onPress={onPress} style={styles.deliverButton}>
          <Text style={styles.deliverButtonText}>{Strings.deliverAll}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Driver avatar, name and completed-trip count. */
export function DashboardTopView({ completedTripCount }: { completedTripCount: number }) {
  const user = useSession((s) => s.user);
  return (
    <View style={styles.topView}>
      <Image source={Images.avatar} style={styles.topAvatar} />
      <View style={styles.topText}>
        <Text style={styles.topName}>{user?.name ?? ''}</Text>
        <Text style={styles.topCount}>
          {`${Strings.tripComplete} : ${completedTripCount}`}
        </Text>
      </View>
    </View>
  );
}

/** Shown when there are no active or in-transit trips. */
export function DashboardEmptyView() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyCircle}>
        <Text style={styles.emptyCircleText}>{Strings.noTripAssigned}</Text>
      </View>
      <View style={styles.emptyFooter}>
        <Text style={styles.emptyTension}>{Strings.tension}</Text>
        <Text style={styles.emptyCrafted}>{Strings.craftedWith}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spacer: { height: 10 },
  divider: { height: 10, backgroundColor: Primary.c100 },

  deliverBody: { paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 },
  deliverAddress: {
    ...Typography.subtitle1.extraBold,
    color: AppColors.text,
    padding: 5,
  },
  deliverButton: {
    height: 42,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliverButtonText: { ...Typography.button2.extraBold, color: AppColors.primary },

  topView: {
    height: 92,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topAvatar: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: Primary.c300,
    resizeMode: 'cover',
  },
  topText: { marginLeft: 15, justifyContent: 'center', flex: 1 },
  topName: { ...Typography.h4.extraBold, color: AppColors.text },
  topCount: { ...Typography.body1.regular, color: AppColors.text, marginTop: 5 },

  empty: { flex: 1, padding: 10, justifyContent: 'space-between' },
  emptyCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    marginTop: 100,
    alignSelf: 'center',
    backgroundColor: TextShade.c100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircleText: {
    ...Typography.h1.extraBold,
    color: TextShade.c400,
    textAlign: 'center',
  },
  emptyFooter: { marginTop: 40 },
  emptyTension: { ...textSize50ExtraBold, color: TextShade.c400 },
  emptyCrafted: {
    ...Typography.subtitle1.medium,
    color: TextShade.c600,
    marginTop: 10,
  },
});
