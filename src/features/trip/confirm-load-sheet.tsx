/**
 * Port of lib/screens/trip_detail/subview/{confirm_load_screen,
 * load_list_cell}.dart.
 *
 * The sheet where the driver reconciles what was ordered against what was
 * actually loaded: per line the product, sub-item, quantity and weight, plus
 * the two trip-level charges.
 */
import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import type { DispatchedProduct, Product, RequestedProduct } from '@/types/trip';
import { ProductPicker } from './product-picker';
import { isAddedItem, useTripDetailStore } from './trip-detail-store';

interface Props {
  visible: boolean;
  products: Product[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmLoadSheet({ visible, products, onCancel, onConfirm }: Props) {
  const insets = useSafeAreaInsets();
  const requestedItems = useTripDetailStore((s) => s.requestedItems);
  const dispatchItems = useTripDetailStore((s) => s.dispatchItems);
  const majuriCharge = useTripDetailStore((s) => s.majuriCharge);
  const kataparchiCharge = useTripDetailStore((s) => s.kataparchiCharge);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.scrim} onPress={Keyboard.dismiss}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 10 }]}>
          <Text style={styles.title}>{Strings.confirmLoad}</Text>

          <FlatList
            data={requestedItems}
            keyExtractor={(_, index) => String(index)}
            keyboardShouldPersistTaps="handled"
            // Lets the list shrink to its content so the charges and actions
            // stay visible, and scroll once the sheet hits its max height.
            style={styles.list}
            renderItem={({ item, index }) => (
              <LoadRow
                requested={item}
                dispatched={dispatchItems[index]}
                index={index}
                products={products}
              />
            )}
            ListFooterComponent={
              <Pressable
                onPress={() => useTripDetailStore.getState().addItem()}
                style={styles.addButton}
              >
                <Ionicons name="add" size={18} color={AppColors.primary} />
                <Text style={styles.addText}>{Strings.addItem}</Text>
              </Pressable>
            }
          />

          <View style={styles.chargesRow}>
            <ChargeInput
              label={Strings.majuriCharge}
              value={majuriCharge}
              onChange={(v) => useTripDetailStore.getState().setMajuriCharge(v)}
            />
            <View style={styles.chargeGap} />
            <ChargeInput
              label={Strings.kataparchiCharge}
              value={kataparchiCharge}
              onChange={(v) => useTripDetailStore.getState().setKataparchiCharge(v)}
            />
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>{Strings.cancel}</Text>
            </Pressable>
            <View style={styles.actionGap} />
            <Pressable
              onPress={() => {
                // An added line with no product chosen would reach the API as
                // an unidentifiable item, so block it here.
                const incomplete = requestedItems.some(
                  (r, i) => isAddedItem(r) && !dispatchItems[i]?.selectedProduct,
                );
                if (incomplete) {
                  Alert.alert(Strings.confirmLoad, Strings.selectProductFirst);
                  return;
                }
                onConfirm();
              }}
              style={styles.confirmButton}
            >
              <Text style={styles.confirmText}>{Strings.confirm}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

/**
 * One order line: the customer's figures on the left (read-only), the driver's
 * on the right (editable).
 */
function LoadRow({
  requested,
  dispatched,
  index,
  products,
}: {
  requested: RequestedProduct;
  dispatched?: DispatchedProduct;
  index: number;
  products: Product[];
}) {
  // Sub-items belong to the *selected* product, so changing the product
  // changes which sub-items are offered.
  const subItems =
    products.find((p) => p.id === dispatched?.selectedProduct?.id)?.subItems ?? [];

  // Driver-added lines have no customer counterpart, so they show a removal
  // control and an "extra" label in place of the ordered figures.
  const isAdded = isAddedItem(requested);

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowHeaderCell}>
          {isAdded ? Strings.extraItem : Strings.customerLoad.toUpperCase()}
        </Text>
        <View style={styles.rowHeaderRight}>
          <Text style={[styles.rowHeaderCell, styles.rowHeaderCellFlush]}>
            {Strings.pickupLoad}
          </Text>
          {isAdded && (
            <Pressable
              onPress={() => useTripDetailStore.getState().removeItem(index)}
              hitSlop={10}
              accessibilityLabel={Strings.removeItem}
            >
              <Ionicons name="close-circle" size={20} color={AppColors.error500} />
            </Pressable>
          )}
        </View>
      </View>

      <RowLine
        left={isAdded ? '—' : requested.product?.name ?? ''}
        right={
          <ProductPicker
            value={dispatched?.selectedProduct}
            options={products}
            onChange={(p) => useTripDetailStore.getState().updateProduct(index, p)}
          />
        }
      />

      {subItems.length > 0 && (
        <RowLine
          left={isAdded ? '—' : requested.subItem?.name ?? ''}
          right={
            <ProductPicker
              value={dispatched?.selectedSubProduct}
              options={subItems}
              onChange={(p) => useTripDetailStore.getState().updateSubItem(index, p)}
            />
          }
        />
      )}

      <RowLine
        // BUG PARITY NOTE: Flutter labelled the quantity row "<qty>KG". Kept as
        // the raw quantity here — the unit was simply wrong, and the adjacent
        // weight row already carries KG.
        left={isAdded ? '—' : `${Math.trunc(requested.qty ?? 0)}`}
        right={
          <NumberField
            value={dispatched?.qty}
            onChange={(v) => useTripDetailStore.getState().updateQty(index, v)}
          />
        }
      />
      <RowLine
        left={isAdded ? '—' : `${Math.trunc(requested.weight ?? 0)}KG`}
        right={
          <NumberField
            value={dispatched?.weight}
            onChange={(v) => useTripDetailStore.getState().updateWeight(index, v)}
          />
        }
      />
    </View>
  );
}

function RowLine({ left, right }: { left: string; right: React.ReactNode }) {
  return (
    <View style={styles.line}>
      <View style={styles.lineLeft}>
        <Text style={styles.lineLeftText}>{left}</Text>
      </View>
      <View style={styles.lineRight}>{right}</View>
    </View>
  );
}

function NumberField({
  value,
  onChange,
}: {
  value?: number;
  onChange: (v: number) => void;
}) {
  return (
    <TextInput
      style={styles.numberInput}
      defaultValue={value != null ? String(Math.trunc(value)) : ''}
      onChangeText={(text) => onChange(Number.parseInt(text, 10) || 0)}
      keyboardType="number-pad"
      returnKeyType="done"
      onSubmitEditing={Keyboard.dismiss}
    />
  );
}

function ChargeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.charge}>
      <Text style={styles.chargeLabel}>{label}</Text>
      <TextInput
        style={styles.chargeInput}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
        keyboardType="number-pad"
        returnKeyType="done"
        placeholder={Strings.enterAmount}
        placeholderTextColor={TextShade.c500}
        onSubmitEditing={Keyboard.dismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    // Flutter pinned this at heightFactor 0.70. Now that rows can be added,
    // a fixed height clipped the new row behind the charges block, so the
    // sheet grows with its content and caps at 90% of the screen instead.
    maxHeight: '90%',
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  list: { flexGrow: 0, flexShrink: 1 },
  title: {
    ...Typography.h4.bold,
    color: AppColors.text,
    marginLeft: 17,
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Primary.c300,
  },
  rowHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: Primary.c300 },
  rowHeaderCell: {
    ...Typography.body2.extraBold,
    color: AppColors.text,
    padding: 12,
    flex: 1,
  },
  // Inside rowHeaderRight the flex/padding come from the container.
  rowHeaderCellFlush: { flex: 0, paddingRight: 0 },
  rowHeaderRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
  },
  addText: {
    ...Typography.button2.extraBold,
    color: AppColors.primary,
    marginLeft: 6,
  },
  line: { flexDirection: 'row', borderBottomWidth: 1, borderColor: Primary.c300 },
  // Flutter's column widths were 1.2 : 1.5.
  lineLeft: { flex: 1.2, paddingVertical: 20, paddingHorizontal: 12 },
  lineLeftText: { ...Typography.body2.extraBold, color: AppColors.text },
  lineRight: { flex: 1.5, paddingLeft: 10, paddingRight: 20, paddingVertical: 10 },
  numberInput: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: AppColors.primary,
    ...Typography.body1.medium,
    color: AppColors.primary,
  },
  chargesRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  chargeGap: { width: 16 },
  charge: { flex: 1 },
  chargeLabel: { ...Typography.body1.semiBold, color: TextShade.c700 },
  chargeInput: {
    height: 40,
    marginTop: 5,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: TextShade.c200,
    ...Typography.body1.semiBold,
    color: AppColors.text,
  },
  actions: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16 },
  actionGap: { width: 16 },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Primary.c300,
    alignItems: 'center',
  },
  cancelText: { ...Typography.button2.extraBold, color: AppColors.primary },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
  },
  confirmText: { ...Typography.button2.extraBold, color: AppColors.white },
});
