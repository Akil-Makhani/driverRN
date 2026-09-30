import { TABLES, useLanguageStore } from '@/core/i18n/language';
import type { Translations } from '@/core/i18n/en';

/**
 * UI copy in the driver's chosen language (see core/i18n).
 *
 * Every read goes to the current language's table, so call sites keep writing
 * `Strings.key`. Screens pick up a change because the root layout remounts
 * each screen when the language changes — see app/_layout.tsx.
 *
 * Read it while rendering, never into a module-level constant: a constant is
 * filled once, in whatever language was active when the file loaded, and
 * then shows that language forever (a Hindi popup over an English screen).
 * Wrap such tables in a function instead.
 */
export const Strings: Translations = new Proxy({} as Translations, {
  get: (_, key: string) =>
    TABLES[useLanguageStore.getState().language][key as keyof Translations],
});
