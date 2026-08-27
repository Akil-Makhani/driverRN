/**
 * Replaces Flutter's DropdownButtonFormField from load_list_cell.dart.
 *
 * RN core has no picker, and pulling in a native one for two fields is not
 * worth the build cost. This is a read-only field that opens a modal list —
 * which also handles long product names better than a dropdown on a narrow
 * table column.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, Primary } from '@/core/constants/colors';
import { Typography } from '@/core/constants/typography';
import type { Product } from '@/types/trip';

interface Props {
  value: Product | null | undefined;
  options: Product[];
  onChange: (product: Product) => void;
  placeholder?: string;
}

export function ProductPicker({ value, options, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const disabled = options.length === 0;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[styles.field, disabled && styles.fieldDisabled]}
      >
        <Text style={styles.fieldText} numberOfLines={1}>
          {value?.name ?? placeholder ?? ''}
        </Text>
        <Ionicons name="chevron-down" size={16} color={AppColors.primary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <FlatList
              data={options}
              keyExtractor={(item, index) => item.id ?? String(index)}
              renderItem={({ item }) => {
                const selected = item.id === value?.id;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <Text style={styles.optionText}>{item.name ?? ''}</Text>
                    {selected && (
                      <Ionicons name="checkmark" size={18} color={AppColors.primary} />
                    )}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Primary.c300,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldDisabled: { opacity: 0.5 },
  fieldText: {
    ...Typography.body1.medium,
    color: AppColors.primary,
    flex: 1,
    marginRight: 6,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    maxHeight: '60%',
    borderRadius: 10,
    backgroundColor: AppColors.white,
    paddingVertical: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionSelected: { backgroundColor: Primary.c100 },
  optionText: { ...Typography.body1.medium, color: AppColors.primary, flex: 1 },
});
