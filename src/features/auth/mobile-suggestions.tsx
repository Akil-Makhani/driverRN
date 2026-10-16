/**
 * Previously verified mobile numbers, offered on the login and registration
 * number fields (ported from TempoRN's login screen).
 *
 * While a full on-screen keyboard is open the chips ride on it — a strip just
 * above the keys on Android, inside the keyboard on iOS. With no full keyboard
 * (floating, handwriting or hardware) they sit under the field instead. Either
 * way they narrow to the numbers matching what has been typed, and disappear
 * once the field already holds one of them.
 */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyboardExtender, useKeyboardState } from 'react-native-keyboard-controller';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Typography } from '@/core/constants/typography';
import { LoginHistory } from '@/core/storage/login-history';
import { groupDigits } from '@/core/utils/number-format';

/** Room the strip takes above the keyboard — add it to the scroll's bottomOffset. */
export const SUGGESTION_STRIP_HEIGHT = 52;

/**
 * A floating / handwriting / hardware-keyboard mode reports "visible" with
 * next to no height, and leaves no room for a strip riding on it.
 */
const MIN_KEYBOARD_HEIGHT = 120;

export function useMobileSuggestions(mobile: string, focused: boolean) {
  const fullKeyboard = useKeyboardState((s) => s.isVisible && s.height > MIN_KEYBOARD_HEIGHT);
  // Read once per screen: a number only joins the list after an OTP verifies,
  // which is on another screen.
  const [recent] = useState(() => LoginHistory.recent());
  const suggestions = useMemo(
    () => recent.filter((n) => n.startsWith(mobile) && n !== mobile),
    [recent, mobile],
  );
  return {
    suggestions,
    showOnKeyboard: focused && fullKeyboard && suggestions.length > 0,
    showInline: !fullKeyboard && suggestions.length > 0,
  };
}

interface ChipsProps {
  numbers: string[];
  onPick: (n: string) => void;
}

function SuggestionChips({ numbers, onPick }: ChipsProps) {
  return (
    <>
      <Ionicons name="time-outline" size={18} color={TextShade.c700} />
      {numbers.map((n) => (
        <Pressable
          key={n}
          onPress={() => onPick(n)}
          accessibilityRole="button"
          accessibilityLabel={`Use ${n}`}
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        >
          <Text style={styles.chipText}>{`+91 ${groupDigits(n)}`}</Text>
        </Pressable>
      ))}
    </>
  );
}

/** Under the field, for when no full keyboard is up. */
export function InlineMobileSuggestions(props: ChipsProps) {
  return (
    <View style={styles.inline}>
      <SuggestionChips {...props} />
    </View>
  );
}

/** Rides on the keyboard. Render it outside the scroll view, as a sibling. */
export function KeyboardMobileSuggestions(props: ChipsProps) {
  return (
    <KeyboardExtender>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        <SuggestionChips {...props} />
      </ScrollView>
    </KeyboardExtender>
  );
}

const styles = StyleSheet.create({
  strip: {
    height: SUGGESTION_STRIP_HEIGHT,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  inline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: AppColors.white,
  },
  chipPressed: { backgroundColor: AppColors.secondary100 },
  chipText: { ...Typography.body2.bold, color: AppColors.primary },
});
