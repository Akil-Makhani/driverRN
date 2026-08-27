/** Port of lib/screens/trip_detail/subview/company_details.dart. */
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { AppColors, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import type { TripDetailsData } from '@/types/trip';

/** Pickup contact, with a tap-to-call button. */
export function CompanyDetails({ details }: { details: TripDetailsData | null }) {
  const address = details?.pickupAddress;
  const phone = address?.contactNumber ?? '';

  const call = () => {
    // Guard the empty case: `tel:` with no number opens a blank dialer.
    if (phone) void Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{Strings.companyDetails}</Text>
        <Pressable onPress={call} hitSlop={8} disabled={!phone}>
          <Image source={Images.call} style={styles.callIcon} />
        </Pressable>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.nameColumn}>
          <Text style={styles.label}>{Strings.name}</Text>
          <Text style={styles.value}>{address?.contactName ?? ''}</Text>
        </View>
        <View style={styles.phoneColumn}>
          <Text style={styles.label}>{Strings.mobileNumber}</Text>
          <Text style={styles.value}>{phone}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 15 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { ...Typography.body1.extraBold, color: AppColors.text },
  callIcon: { width: 40, height: 40, resizeMode: 'contain' },
  detailRow: { flexDirection: 'row', marginTop: 8 },
  // Flutter split these 2/3 and 1/3 of the content width.
  nameColumn: { flex: 2 },
  phoneColumn: { flex: 1 },
  label: { ...Typography.body2.semiBold, color: TextShade.c700 },
  value: { ...Typography.subtitle2.extraBold, color: AppColors.text, marginTop: 2 },
});
