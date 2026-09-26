/**
 * Opens the language choice from the dashboard, so a driver doesn't have to
 * dig into Profile to switch. Shown as a labelled pill — globe, the current
 * language in its own script, and a chevron — because a bare icon wasn't
 * recognisable as a language switch.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { LANGUAGES, useLanguageStore } from '@/core/i18n/language';
import { LanguageOptions } from './language-options';

export function LanguageButton() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const language = useLanguageStore((s) => s.language);
  const current = LANGUAGES.find((l) => l.code === language)?.label ?? '';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        style={styles.pill}
        accessibilityRole="button"
        accessibilityLabel={Strings.language}
      >
        <Ionicons name="globe-outline" size={18} color={AppColors.primary} />
        <Text style={styles.pillText}>{current}</Text>
        <Ionicons name="chevron-down" size={16} color={AppColors.primary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.scrim} onPress={close}>
          {/* Stop taps inside the card from reaching the scrim. */}
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{Strings.language}</Text>
            <Text style={styles.hint}>{Strings.languageHint}</Text>
            <LanguageOptions onChosen={close} />
            <Pressable onPress={close} style={styles.cancel} hitSlop={4}>
              <Text style={styles.cancelText}>{Strings.dialogCancel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
  },
  pillText: { ...Typography.body2.extraBold, color: AppColors.primary },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    backgroundColor: AppColors.white,
    padding: 24,
  },
  title: { ...Typography.h4.bold, color: AppColors.text },
  hint: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    marginTop: 6,
    marginBottom: 6,
  },
  cancel: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 },
  cancelText: { ...Typography.body1.medium, color: TextShade.c700 },
});
