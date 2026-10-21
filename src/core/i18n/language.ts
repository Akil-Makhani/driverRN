import { create } from 'zustand';

import { Preference } from '../storage/preference';
import { en, type Translations } from './en';
import { gu } from './gu';
import { hi } from './hi';

export type Language = 'gu' | 'hi' | 'en';

/**
 * Used until the server says otherwise. The admin sets each driver's language
 * when adding them, and the API defaults it to English too.
 */
export const DEFAULT_LANGUAGE: Language = 'en';

/** Shown in each language's own script, so a driver can find theirs. */
export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'gu', label: 'ગુજરાતી' },
];

export const TABLES: Record<Language, Translations> = { en, hi, gu };

const LANGUAGE_KEY = 'app_language';

export function isLanguage(v: unknown): v is Language {
  return v === 'en' || v === 'hi' || v === 'gu';
}

/**
 * Whether this phone has a language of its own: picked on the first-run
 * screen, changed in the app, or adopted from the server by an older build.
 * Once it has, that choice wins over the server's copy, and survives logout
 * because clearAuthData never touches it.
 */
export function hasChosenLanguage(): boolean {
  return isLanguage(Preference.raw.getString(LANGUAGE_KEY));
}

function stored(): Language {
  const v = Preference.raw.getString(LANGUAGE_KEY);
  return isLanguage(v) ? v : DEFAULT_LANGUAGE;
}

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: stored(),
  setLanguage(language) {
    Preference.raw.set(LANGUAGE_KEY, language);
    // Setting the same value would still remount every screen (see
    // app/_layout.tsx), so a profile reload that changes nothing is a no-op.
    set((s) => (s.language === language ? s : { language }));
  },
}));

/** Where each script's zero sits in Unicode; English keeps 0-9. */
const DIGIT_ZERO: Record<Language, number | null> = { en: null, hi: 0x0966, gu: 0x0ae6 };

/**
 * Writes 0-9 in the current language's script: "98765 43210" reads
 * "९८७६५ ४३२१०" in Hindi and "૯૮૭૬૫ ૪૩૨૧૦" in Gujarati. For display only —
 * what is stored and sent stays ASCII (see toAsciiDigits).
 */
export function localDigits(value: string): string {
  const zero = DIGIT_ZERO[useLanguageStore.getState().language];
  if (zero == null) return value;
  return value.replace(/[0-9]/g, (d) => String.fromCharCode(zero + Number(d)));
}
