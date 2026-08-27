/**
 * The 3-column product table used by both dynamic_product_table.dart (ordered)
 * and pickup_loading_detail.dart (loaded). Flutter duplicated the Table and
 * its _buildTableRow in both files; the shape is identical, so it lives here
 * once and each caller supplies its own rows.
 */
import { StyleSheet, Text, View } from 'react-native';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';

export interface ProductRow {
  label: string;
  qty: string;
  weight: string;
}

interface Props {
  rows: ProductRow[];
  total: ProductRow;
}

export function ProductTable({ rows, total }: Props) {
  return (
    <View style={styles.table}>
      <Row
        cells={[Strings.productSize, Strings.quantity, Strings.weight]}
        variant="header"
      />
      {rows.map((row, index) => (
        <Row key={index} cells={[row.label, row.qty, row.weight]} />
      ))}
      <Row cells={[total.label, total.qty, total.weight]} variant="total" />
    </View>
  );
}

function Row({
  cells,
  variant = 'body',
}: {
  cells: [string, string, string];
  variant?: 'header' | 'body' | 'total';
}) {
  const textStyle =
    variant === 'header'
      ? styles.headerText
      : variant === 'total'
        ? styles.totalText
        : styles.bodyText;

  return (
    <View style={styles.row}>
      {cells.map((cell, index) => (
        <View
          key={index}
          // Flutter column widths were 2 : 1.5 : 1.5.
          style={[styles.cell, index === 0 ? styles.cellWide : styles.cellNarrow]}
        >
          <Text style={textStyle}>{cell}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { borderTopWidth: 1, borderColor: Primary.c300 },
  row: { flexDirection: 'row' },
  cell: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: Primary.c300,
  },
  cellWide: { flex: 2, borderLeftWidth: 1 },
  cellNarrow: { flex: 1.5 },
  headerText: { ...Typography.body2.semiBold, color: TextShade.c700 },
  bodyText: { ...Typography.body2.extraBold, color: AppColors.text },
  totalText: { ...Typography.body2.extraBold, color: AppColors.primary },
});
