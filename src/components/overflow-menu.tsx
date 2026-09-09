/**
 * The app bar's "⋮" menu.
 *
 * Actions that are neither part of moving a trip forward nor frequent enough
 * to earn a permanent button live here — cancelling a trip is the first. The
 * bottom bar is reserved for the step the driver is meant to take next, so a
 * destructive action sitting in it competed with the very button it was trying
 * not to be confused with.
 *
 * Anchored under the bar rather than centred on screen: a menu that drops from
 * the dots that opened it reads as belonging to them.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, TextShade } from '@/core/constants/colors';
import { Typography } from '@/core/constants/typography';

export interface OverflowItem {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Renders the row in red — used for actions that cannot be undone. */
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  items: OverflowItem[];
  accessibilityLabel?: string;
}

export function OverflowMenu({ items, accessibilityLabel }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? 160 : 120,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, progress]);

  // No actions means no dots, rather than a button that opens an empty card.
  if (!items.length) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={styles.dots}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Ionicons name="ellipsis-vertical" size={22} color={AppColors.text} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        {/* Anywhere outside the card closes, including the bar it hangs from. */}
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <Animated.View
            style={[
              styles.sheet,
              { top: insets.top + 52 },
              {
                opacity: progress,
                transform: [
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                    }),
                  },
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {items.map((item, index) => (
              <Pressable
                key={item.title}
                onPress={() => {
                  // Closed before the action runs: an action that opens its own
                  // dialog must not have this menu left sitting on top of it.
                  setOpen(false);
                  item.onPress();
                }}
                style={({ pressed }) => [
                  styles.item,
                  index > 0 && styles.itemDivided,
                  pressed && styles.itemPressed,
                ]}
                accessibilityRole="button"
              >
                <Ionicons
                  name={item.icon}
                  size={19}
                  color={item.destructive ? AppColors.error600 : TextShade.c800}
                />
                <Text
                  style={[
                    styles.itemText,
                    { color: item.destructive ? AppColors.error600 : TextShade.c800 },
                  ]}
                >
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dots: { padding: 8 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  sheet: {
    position: 'absolute',
    right: 12,
    minWidth: 200,
    borderRadius: 12,
    backgroundColor: AppColors.white,
    paddingVertical: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TextShade.c300,
  },
  itemPressed: { backgroundColor: TextShade.c100 },
  itemText: { ...Typography.body1.bold, marginLeft: 12 },
});
