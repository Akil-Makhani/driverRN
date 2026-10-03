/**
 * The tempo driver's Delivered: the same sheet as Confirm Load, filled with
 * what was loaded. Product and size are fixed by then — only the quantity and
 * weight actually handed over can change, and those go to the admin panel and
 * the customer as the delivered figures.
 */
import { useEffect, useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import type { DispatchedProduct } from '@/types/trip';
import { loadSheetStyles as styles, NumberField, RowLine } from './confirm-load-sheet';

export interface DeliveredLine {
  qty: number;
  weight: number;
}

interface Props {
  visible: boolean;
  /** The trip's confirmed load, one row per line, in the server's order. */
  loaded: DispatchedProduct[];
  onCancel: () => void;
  onConfirm: (lines: DeliveredLine[]) => void;
}

export function ConfirmDeliverySheet({ visible, loaded, onCancel, onConfirm }: Props) {
  const insets = useSafeAreaInsets();
  const [lines, setLines] = useState<DeliveredLine[]>([]);

  // Every opening starts from what was loaded, so a cancelled edit is not
  // carried into the next attempt.
  useEffect(() => {
    if (visible) {
      setLines(loaded.map((l) => ({ qty: l.qty ?? 0, weight: l.weight ?? 0 })));
    }
  }, [visible, loaded]);

  const update = (index: number, change: Partial<DeliveredLine>) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...change } : l)));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.scrim}>
        {/* A tap outside the sheet closes it, as the step dialogs do. Nothing
            is lost: every opening starts again from what was loaded. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            Keyboard.dismiss();
            onCancel();
          }}
        />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{Strings.confirmDelivery}</Text>

          <KeyboardAwareScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            bottomOffset={24}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {loaded.map((item, index) => {
              // What actually went on the tempo, which the driver may have
              // changed from the order at Confirm Load.
              const product = item.changeInProduct?.name ?? item.product?.name ?? '';
              const size = item.changeInSubItem?.name ?? item.subItem?.name;
              return (
                <View key={index} style={styles.row}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowHeaderCell}>{Strings.loadedLoad}</Text>
                    <Text style={styles.rowHeaderCell}>{Strings.deliveredLoad}</Text>
                  </View>
                  <RowLine left={Strings.product} right={<Locked text={product} />} />
                  {size ? <RowLine left={Strings.size} right={<Locked text={size} />} /> : null}
                  <RowLine
                    left={`${Math.trunc(item.qty ?? 0)}`}
                    right={
                      <NumberField
                        value={lines[index]?.qty}
                        onChange={(v) => update(index, { qty: v })}
                      />
                    }
                  />
                  <RowLine
                    left={`${Math.trunc(item.weight ?? 0)}KG`}
                    right={
                      <NumberField
                        value={lines[index]?.weight}
                        onChange={(v) => update(index, { weight: v })}
                      />
                    }
                  />
                </View>
              );
            })}
          </KeyboardAwareScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>{Strings.cancel}</Text>
            </Pressable>
            <View style={styles.actionGap} />
            <Pressable onPress={() => onConfirm(lines)} style={styles.confirmButton}>
              <Text style={styles.confirmText}>{Strings.confirm}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Product and size as plain text: fixed at Confirm Load, not editable here. */
function Locked({ text }: { text: string }) {
  return (
    <View style={lockedStyles.box}>
      <Text style={lockedStyles.text}>{text}</Text>
    </View>
  );
}

const lockedStyles = StyleSheet.create({
  box: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: TextShade.c100,
  },
  text: { ...styles.lineLeftText, color: TextShade.c700 },
});
