/**
 * Port of lib/screens/trip_detail/subview/{confirm_load_screen,
 * load_list_cell}.dart.
 *
 * The sheet where the driver reconciles what was ordered against what was
 * actually loaded: per line the product, sub-item, quantity and weight, plus
 * the two trip-level charges.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { useDashboardStore } from '@/features/dashboard/dashboard-store';
import { type DispatchedProduct, offeredIn, type Product, type RequestedProduct } from '@/types/trip';
import { LoadChangeNotice } from './load-change-notice';
import { ProductPicker } from './product-picker';
import { isAddedItem, useTripDetailStore } from './trip-detail-store';

interface Props {
  visible: boolean;
  products: Product[];
  /** 'tempo' or 'truck': only that module's products are offered. */
  orderKind?: string;
  /** The trip pays a fare, so a weight change moves the driver's earning. */
  hasFare: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * A size compared by what it says, not by its id: the catalogue holds the same
 * size more than once under different ids (Slab has two 800*2400s, Tiles three
 * 300*1200s), so matching ids let a second 800*2400 line through.
 */
const sizeName = (size?: { name?: string } | null): string =>
  (size?.name ?? '').replace(/\s+/g, '').toUpperCase();

/** Products are compared by name too, for the same reason. */
const productName = (product?: { name?: string; code?: string } | null): string =>
  (product?.name ?? product?.code ?? '').replace(/\s+/g, '').toUpperCase();

/** One entry per size name, first occurrence kept. */
function uniqueSizes(sizes: Product[]): Product[] {
  const seen = new Set<string>();
  return sizes.filter((s) => {
    const name = sizeName(s);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

/**
 * A row's product and size as one key, or null while it is not fully chosen
 * (a product that has sizes, with none picked yet).
 */
function pairKey(row: DispatchedProduct | undefined, products: Product[]): string | null {
  const selected = row?.selectedProduct;
  const name = productName(selected);
  if (!name) return null;
  const catalogue = products.find((p) => p.id === selected?.id || productName(p) === name);
  const hasSizes = (catalogue?.subItems.length ?? 0) > 0;
  if (hasSizes && !row?.selectedSubProduct) return null;
  return `${name}|${sizeName(row?.selectedSubProduct)}`;
}

/** A chosen product or size that is not the one the customer ordered. */
function differsFromOrder(row: DispatchedProduct, ordered?: RequestedProduct): boolean {
  const product = row.selectedProduct;
  const size = row.selectedSubProduct;
  // Id first: an ordered line can spell a name differently from the catalogue,
  // and that must not read as a change the driver made.
  const sameProduct =
    product?.id === ordered?.product?.productId ||
    productName(product) === productName(ordered?.product);
  const sameSize =
    size?.id === ordered?.subItem?.productId || sizeName(size) === sizeName(ordered?.subItem);
  return (product != null && !sameProduct) || (size != null && !sameSize);
}

const sum = (rows: { qty?: number; weight?: number }[], key: 'qty' | 'weight') =>
  rows.reduce((total, row) => total + Math.trunc(row[key] ?? 0), 0);

export function ConfirmLoadSheet({
  visible,
  products,
  orderKind,
  hasFare,
  onCancel,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const requestedItems = useTripDetailStore((s) => s.requestedItems);
  const dispatchItems = useTripDetailStore((s) => s.dispatchItems);
  // Majuri / Kataparchi charges are hidden from the driver for now (see the
  // commented-out chargesRow below). Left blank in the store, they are simply
  // not sent with the load.
  // const majuriCharge = useTripDetailStore((s) => s.majuriCharge);
  // const kataparchiCharge = useTripDetailStore((s) => s.kataparchiCharge);
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  /** Set by Add Item, so the list follows the new row once it has laid out. */
  const scrollToNewRow = useRef(false);

  // Every picker is disabled while the catalogue is empty, which leaves an
  // added row with no product to choose — and CONFIRM refuses a row without
  // one. The list is normally fetched by the dashboard; a trip opened some
  // other way (a notification, a won offer) can reach here before that.
  useEffect(() => {
    if (visible && products.length === 0) {
      void useDashboardStore.getState().getProducts();
    }
  }, [visible, products.length]);

  const addItem = () => {
    Keyboard.dismiss();
    scrollToNewRow.current = true;
    useTripDetailStore.getState().addItem();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.scrim}>
        {/* A tap outside the sheet closes it, as the delivery sheet does. The
            edits live in the store, so nothing typed is lost. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            Keyboard.dismiss();
            onCancel();
          }}
        />

        {/* Capped at 90% of a full-screen parent, so rows beyond that scroll
            instead of pushing the sheet off the top of the screen. */}
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{Strings.confirmLoad}</Text>

          {/* Outside the scroll, so it stays in view while a field is edited. */}
          <LoadChangeNotice
            hint={hasFare ? Strings.loadNoticeLoadHint : Strings.loadNoticeNoFareLoadHint}
            fromWeight={sum(requestedItems, 'weight')}
            toWeight={sum(dispatchItems, 'weight')}
            fromQty={sum(requestedItems, 'qty')}
            toQty={sum(dispatchItems, 'qty')}
            addedItems={dispatchItems.length - requestedItems.length}
            productChanged={requestedItems.some((r, i) =>
              dispatchItems[i] ? differsFromOrder(dispatchItems[i], r) : false,
            )}
            hasFare={hasFare}
          />

          {/* Keyboard-aware rather than a plain list: the app draws edge to
              edge, so Android no longer shrinks the window for the keyboard,
              and inside a Modal the old KeyboardAvoidingView did nothing — the
              field being typed in sat behind the keyboard with no way to reach
              it. This scrolls whichever field has focus to just above the
              keyboard, and pads the end so every row and both charges can be
              scrolled up past it. The charges live inside it for that reason. */}
          <KeyboardAwareScrollView
            ref={scrollRef}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            bottomOffset={24}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            onContentSizeChange={() => {
              if (!scrollToNewRow.current) return;
              scrollToNewRow.current = false;
              scrollRef.current?.scrollToEnd({ animated: true });
            }}
          >
            {/* Driven by dispatchItems: it holds a row per customer line *plus*
                any the driver added, so it is the longer of the two arrays. */}
            {dispatchItems.map((item, index) => (
              <LoadRow
                key={index}
                requested={requestedItems[index]}
                dispatched={item}
                index={index}
                requestedCount={requestedItems.length}
                products={products}
                orderKind={orderKind}
                rows={dispatchItems}
              />
            ))}

            <Pressable onPress={addItem} style={styles.addButton}>
              <Ionicons name="add-circle-outline" size={20} color={AppColors.primary} />
              <Text style={styles.addText}>{Strings.addItem}</Text>
            </Pressable>

            {/* Hidden from the driver for now — uncomment, along with the two
                selectors at the top, to bring the charges back.
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
            */}
          </KeyboardAwareScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>{Strings.cancel}</Text>
            </Pressable>
            <View style={styles.actionGap} />
            <Pressable
              onPress={() => {
                // An added line with no product chosen would reach the API as
                // an unidentifiable item, so block it here.
                const incomplete = dispatchItems.some(
                  (d, i) =>
                    isAddedItem(i, requestedItems.length) && !d.selectedProduct,
                );
                if (incomplete) {
                  Alert.alert(Strings.confirmLoad, Strings.selectProductFirst);
                  return;
                }
                // A zero weight silently under-bills: the API sums dispatched
                // weights into totals.actualWeight, so an unweighed extra line
                // contributes nothing to the order.
                const unweighed = dispatchItems.some(
                  (d, i) =>
                    isAddedItem(i, requestedItems.length) && !(d.weight && d.weight > 0),
                );
                if (unweighed) {
                  Alert.alert(Strings.confirmLoad, Strings.enterWeightFirst);
                  return;
                }
                // The pickers already hide a product and size another row
                // carries, but a row changed afterwards can still collide.
                const keys = dispatchItems.map((d) => pairKey(d, products));
                const duplicate = keys.some(
                  (k, i) => k != null && keys.indexOf(k) !== i,
                );
                if (duplicate) {
                  Alert.alert(Strings.confirmLoad, Strings.duplicateLoadItem);
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
      </View>
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
  requestedCount,
  products,
  orderKind,
  rows,
}: {
  /** Absent for a driver-added row — there is no customer line to compare to. */
  requested?: RequestedProduct;
  dispatched?: DispatchedProduct;
  index: number;
  requestedCount: number;
  products: Product[];
  orderKind?: string;
  /** Every row on the sheet, this one included. */
  rows: DispatchedProduct[];
}) {
  // Sub-items belong to the *selected* product, so changing the product
  // changes which sub-items are offered.
  const subItems =
    products.find((p) => p.id === dispatched?.selectedProduct?.id)?.subItems ?? [];

  // Driver-added lines have no customer counterpart, so they show a removal
  // control, an "extra" label, and in place of the ordered figures the name of
  // each field — a bare dash left the driver guessing which box was which.
  const isAdded = isAddedItem(index, requestedCount);

  // Only what this order's module offers (the admin's App Setting choice), so
  // a tempo driver is not offered Carton or Sanitary the tempo module left out.
  const offered = products.filter((p) => offeredIn(p, orderKind));

  // An added line is for something not on the load yet: 600x600 tiles can be
  // added next to 100x100 ones, but not a second 100x100 line. Pairs other
  // rows already carry are left out of this row's choices, and a product with
  // every size taken is left out altogether.
  const taken = new Set(
    rows
      .filter((_, i) => i !== index)
      .map((r) => pairKey(r, products))
      .filter((k): k is string => k != null),
  );
  const productOptions = isAdded
    ? offered.filter((p) =>
        p.subItems.length
          ? p.subItems.some((s) => !taken.has(`${productName(p)}|${sizeName(s)}`))
          : !taken.has(`${productName(p)}|`),
      )
    : offered;
  // The same size listed twice in the catalogue is offered once.
  const sizeOptions = uniqueSizes(
    isAdded
      ? subItems.filter(
          (s) => !taken.has(`${productName(dispatched?.selectedProduct)}|${sizeName(s)}`),
        )
      : subItems,
  );

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
        left={isAdded ? Strings.product : requested?.product?.name ?? ''}
        right={
          <ProductPicker
            value={dispatched?.selectedProduct}
            options={productOptions}
            placeholder={isAdded ? Strings.selectProduct : undefined}
            onChange={(p) => useTripDetailStore.getState().updateProduct(index, p)}
          />
        }
      />

      {/* Always rendered on an added row, even before a product is chosen, so
          the row keeps a stable height. Letting it appear only once sub-items
          existed shifted the qty/weight fields down mid-edit, which is how
          weights were being submitted as 0. */}
      {(subItems.length > 0 || isAdded) && (
        <RowLine
          left={isAdded ? Strings.size : requested?.subItem?.name ?? ''}
          right={
            <ProductPicker
              value={dispatched?.selectedSubProduct}
              options={sizeOptions}
              placeholder={Strings.selectSize}
              onChange={(p) => useTripDetailStore.getState().updateSubItem(index, p)}
            />
          }
        />
      )}

      <RowLine
        // BUG PARITY NOTE: Flutter labelled the quantity row "<qty>KG". Kept as
        // the raw quantity here — the unit was simply wrong, and the adjacent
        // weight row already carries KG.
        left={isAdded ? Strings.quantity : `${Math.trunc(requested?.qty ?? 0)}`}
        right={
          <NumberField
            value={dispatched?.qty}
            onChange={(v) => useTripDetailStore.getState().updateQty(index, v)}
          />
        }
      />
      <RowLine
        left={isAdded ? `${Strings.weight} (${Strings.kg})` : `${Math.trunc(requested?.weight ?? 0)}KG`}
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

export function RowLine({ left, right }: { left: string; right: React.ReactNode }) {
  return (
    <View style={styles.line}>
      <View style={styles.lineLeft}>
        <Text style={styles.lineLeftText}>{left}</Text>
      </View>
      <View style={styles.lineRight}>{right}</View>
    </View>
  );
}

export function NumberField({
  value,
  onChange,
}: {
  value?: number;
  onChange: (v: number) => void;
}) {
  return (
    <TextInput
      style={styles.numberInput}
      // Controlled: `defaultValue` only seeds the first render, so a row added
      // or removed after mount kept the previous row's text while the store
      // held something else. A blank shows for 0 so an added line reads as
      // empty-and-required rather than a filled-in zero.
      value={value ? String(Math.trunc(value)) : ''}
      placeholder="0"
      placeholderTextColor={TextShade.c500}
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

/** Shared with ConfirmDeliverySheet, which draws the same rows. */
export const loadSheetStyles = StyleSheet.create({
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
  // Shrinks to its content, and scrolls once the sheet reaches its cap.
  list: { flexGrow: 0, flexShrink: 1 },
  listContent: { paddingBottom: 8 },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Primary.c300,
    marginTop: 10,
  },
  title: {
    ...Typography.h4.bold,
    color: AppColors.text,
    marginLeft: 17,
    marginTop: 10,
    marginBottom: 4,
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
    height: 46,
    marginTop: 4,
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
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

const styles = loadSheetStyles;
