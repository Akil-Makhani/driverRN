/**
 * The English / Hindi / Gujarati choice, shared by the profile screen and the
 * dashboard's language button so both look and behave the same.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, Primary } from '@/core/constants/colors';
import { Typography } from '@/core/constants/typography';
import { type Language, LANGUAGES, useLanguageStore } from '@/core/i18n/language';
import { UserRepository } from '@/core/services/user-repository';

/**
 * Switches the app at once, then saves the choice on the server so the admin
 * panel shows it and it follows the driver to another phone. A failed save
 * leaves the app in the new language; the next profile load reconciles.
 */
export function chooseLanguage(language: Language) {
  useLanguageStore.getState().setLanguage(language);
  UserRepository.updateLanguage(language).catch((e) => {
    if (__DEV__) console.log('updateLanguage failed:', e);
  });
}

/** One radio row per language, each labelled in its own script. */
export function LanguageOptions({ onChosen }: { onChosen?: () => void }) {
  const language = useLanguageStore((s) => s.language);
  return (
    <>
      {LANGUAGES.map(({ code, label }) => {
        const selected = code === language;
        return (
          <Pressable
            key={code}
            onPress={() => {
              // Close first: choosing remounts every screen (app/_layout.tsx).
              onChosen?.();
              if (!selected) chooseLanguage(code);
            }}
            style={[styles.row, selected && styles.rowSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected && <View style={styles.radioDot} />}
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 15,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
  },
  rowSelected: {
    borderColor: AppColors.primary,
    backgroundColor: Primary.c100,
  },
  label: { ...Typography.body1.semiBold, color: AppColors.text },
  labelSelected: { ...Typography.body1.extraBold, color: AppColors.primary },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Primary.c300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: AppColors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.primary,
  },
});
