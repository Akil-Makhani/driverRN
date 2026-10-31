/**
 * The banner at the top of Confirm Load and Confirm Delivery. It says what the
 * figures on the sheet do before the driver commits them, and turns into a live
 * summary as soon as something differs.
 *
 * The wording stays at "can" because the API prices the load, in steps, after
 * CONFIRM: only quantity is known not to matter, as fares follow weight alone.
 */
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';

interface Props {
  /** Shown until something changes. */
  hint: string;
  fromWeight: number;
  toWeight: number;
  fromQty: number;
  toQty: number;
  /** Rows the driver added at Confirm Load. */
  addedItems?: number;
  /** A row's product or size differs from the order. */
  productChanged?: boolean;
  /** A hand-assigned trip carries no fare, so nothing about pay applies to it. */
  hasFare: boolean;
}

const ARROW = '→';

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function LoadChangeNotice({
  hint,
  fromWeight,
  toWeight,
  fromQty,
  toQty,
  addedItems = 0,
  productChanged = false,
  hasFare,
}: Props) {
  const weightDiff = Math.trunc(toWeight) - Math.trunc(fromWeight);
  const qtyDiff = Math.trunc(toQty) - Math.trunc(fromQty);
  const changed = weightDiff !== 0 || qtyDiff !== 0 || addedItems > 0 || productChanged;

  if (!changed) {
    return (
      <View style={[styles.box, styles.info]}>
        <Ionicons name="information-circle" size={20} color={AppColors.primary} />
        <Text style={[styles.body, styles.text]}>{hint}</Text>
      </View>
    );
  }

  const lines: string[] = [];
  if (weightDiff !== 0) {
    lines.push(
      `${Strings.weight}: ${Math.trunc(fromWeight)} ${ARROW} ${Math.trunc(toWeight)} ${Strings.kg} (${signed(weightDiff)} ${Strings.kg})`,
    );
    if (hasFare) {
      lines.push(weightDiff > 0 ? Strings.loadNoticeMoreWeight : Strings.loadNoticeLessWeight);
    }
  }
  if (qtyDiff !== 0) {
    lines.push(`${Strings.quantity}: ${Math.trunc(fromQty)} ${ARROW} ${Math.trunc(toQty)}`);
    if (hasFare && weightDiff === 0) lines.push(Strings.loadNoticeQtyOnly);
  }
  if (addedItems > 0) lines.push(`${Strings.loadNoticeItemsAdded}: ${addedItems}`);
  if (productChanged) lines.push(Strings.loadNoticeProductChanged);
  if (hasFare && weightDiff !== 0) lines.push(Strings.loadNoticeAfterConfirm);

  return (
    <View style={[styles.box, styles.alert]}>
      <Ionicons name="alert-circle" size={20} color={ALERT_INK} />
      <View style={styles.body}>
        <Text style={styles.title}>{Strings.loadNoticeChanged}</Text>
        {lines.map((line) => (
          <Text key={line} style={styles.text}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

const ALERT_INK = '#B54708';

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  info: { backgroundColor: Primary.c100, borderColor: Primary.c300 },
  alert: { backgroundColor: '#FFFAEB', borderColor: '#FEDF89' },
  body: { flex: 1, marginLeft: 8 },
  title: { ...Typography.body2.extraBold, color: ALERT_INK, marginBottom: 2 },
  text: { ...Typography.body2.medium, color: TextShade.c800 },
});
