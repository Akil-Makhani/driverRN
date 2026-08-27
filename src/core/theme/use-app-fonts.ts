import { useFonts } from 'expo-font';

import { FONT_ASSETS } from '../constants/fonts';

/**
 * Loads Manrope + Nunito Sans (the two families the Flutter app shipped).
 * Returns [loaded, error]; the root layout holds the splash until loaded.
 */
export function useAppFonts(): [boolean, Error | null] {
  const [loaded, error] = useFonts(FONT_ASSETS);
  return [loaded, error];
}
