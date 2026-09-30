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
