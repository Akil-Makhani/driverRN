/** Port of lib/screens/trip_detail/subview/dynamic_product_table.dart. */
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { AppColors, GreenGradient, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import type { TripDetailsData } from '@/types/trip';
import { ProductTable, type ProductRow } from './product-table';

/** What the customer ordered, plus the vehicle numbers and drop company. */
export function OrderDetails({ details }: { details: TripDetailsData | null }) {
  const requested = details?.productDifferences?.requested ?? [];
  const deliveries = details?.deliveries ?? [];

  const totalQty = requested.reduce((sum, p) => sum + (p.qty ?? 0), 0);
  const totalWeight = requested.reduce((sum, p) => sum + (p.weight ?? 0), 0);

  const rows: ProductRow[] = requested.map((p) => ({
    label: `${p.product?.name ?? ''}${p.subItem ? ` ${p.subItem.name ?? ''}` : ''}`,
    qty: `${Math.trunc(p.qty ?? 0)}Box`,
    weight: `${Math.trunc(p.weight ?? 0)}KG`,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{Strings.orderDetails}</Text>

      <View style={styles.card}>
        <LinearGradient
          colors={GreenGradient.colors}
          locations={GreenGradient.locations}
          start={GreenGradient.start}
          end={GreenGradient.end}
          style={styles.cardHeader}
        >
          <Image source={Images.greenIcon} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>
            {details?.pickupAddress?.companyName ?? ''}
          </Text>
        </LinearGradient>

        {requested.length > 0 && (
          <ProductTable
            rows={rows}
            total={{
              label: Strings.total,
              qty: `${Math.trunc(totalQty)}Box`,
              weight: `${Math.trunc(totalWeight)}KG`,
            }}
          />
        )}
      </View>

      <View style={styles.numbersRow}>
        <NumberBlock label={Strings.tempoNumber} value={details?.tempoNumber} />
        <NumberBlock label={Strings.truckNumber} value={details?.truckNumber} />
        <NumberBlock label={Strings.lrNumber} value={details?.lrNumber} />
      </View>

      {deliveries.length > 0 && (
        <LinearGradient
          colors={GreenGradient.colors}
          locations={GreenGradient.locations}
          start={GreenGradient.start}
          end={GreenGradient.end}
          style={styles.dropRow}
        >
          <Image source={Images.locationRed} style={styles.dropIcon} />
          <Text style={styles.dropText}>
            {deliveries[0].address?.companyName ?? ''}
          </Text>
        </LinearGradient>
      )}
    </View>
  );
}

function NumberBlock({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.numberBlock}>
      <Text style={styles.numberLabel}>{label}</Text>
      <Text style={styles.numberValue}>{value ?? ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 15 },
  sectionTitle: { ...Typography.body1.extraBold, color: AppColors.text },
  card: {
    marginTop: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Primary.c300,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  cardIcon: { width: 25, height: 25, resizeMode: 'contain' },
  cardTitle: {
    ...Typography.body1.extraBold,
    color: AppColors.text,
    flex: 1,
    marginLeft: 12,
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  numberBlock: { flex: 1 },
  numberLabel: { ...Typography.body2.semiBold, color: TextShade.c700 },
  numberValue: {
    ...Typography.subtitle2.extraBold,
    color: AppColors.text,
    marginTop: 2,
  },
  dropRow: {
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Primary.c300,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropIcon: { width: 24, height: 24, resizeMode: 'contain' },
  dropText: {
    ...Typography.body1.extraBold,
    color: AppColors.text,
    flex: 1,
    marginLeft: 10,
  },
});
