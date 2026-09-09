/**
 * Ports bottomsheet_with_one_button.dart and bottomsheet_with_two_buton.dart.
 * One component: the second button is simply optional, since the two Flutter
 * widgets differed only by that.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, Primary } from '@/core/constants/colors';
import { PrimaryButton } from '@/core/constants/buttons';
import { Typography } from '@/core/constants/typography';

interface Props {
  /** The outlined (secondary) action. Omit for a single-button bar. */
  secondary?: { title: string; onPress: () => void };
  primary: { title: string; onPress: () => void };
}

/**
 * Every slot here moves the trip forward. Destructive actions deliberately do
 * not live in this bar — cancelling an accepted trip sits in the app bar's
 * overflow menu instead, because a driver taps this bar from memory.
 */
export function BottomActionBar({ secondary, primary }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.row}>
        {secondary && (
          <>
            <Pressable onPress={secondary.onPress} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>{secondary.title}</Text>
            </Pressable>
            <View style={styles.gap} />
          </>
        )}
        <Pressable onPress={primary.onPress} style={styles.primaryButton}>
          <Text style={styles.primaryText}>{primary.title}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 15,
    paddingTop: 15,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 13.1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  gap: { width: 15 },
  secondaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...Typography.button2.extraBold, color: AppColors.primary },
  primaryButton: {
    flex: 1,
    ...PrimaryButton.shape,
  },
  primaryText: { ...PrimaryButton.label },
});
