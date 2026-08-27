import type { TextStyle } from 'react-native';

import { Fonts } from './fonts';

/**
 * 1:1 port of lib/utility/common_style.dart (AppTextStyles).
 *
 * Flutter took (TextWeight, Color) arguments and returned a TextStyle. Colors
 * belong in the StyleSheet here, so each scale is a record keyed by weight and
 * callers compose: `[Typography.body1.bold, { color: AppColors.text }]`.
 *
 * Font sizes and letterSpacing are copied exactly. Flutter left `height`
 * unset, meaning the font's own metrics decided line height; RN behaves the
 * same when lineHeight is omitted, so it is omitted here too.
 */

type Weight =
  | 'light'
  | 'regular'
  | 'medium'
  | 'semiBold'
  | 'bold'
  | 'extraBold';

function scale(
  family: 'manrope' | 'nunitoSans',
  fontSize: number,
  letterSpacing: number,
): Record<Weight, TextStyle> {
  const f = Fonts[family];
  const base = { fontSize, letterSpacing } as const;
  return {
    light: { ...base, fontFamily: f.light },
    regular: { ...base, fontFamily: f.regular },
    medium: { ...base, fontFamily: f.medium },
    semiBold: { ...base, fontFamily: f.semiBold },
    bold: { ...base, fontFamily: f.bold },
    extraBold: { ...base, fontFamily: f.extraBold },
  };
}

export const Typography = {
  // ── Manrope scale ──────────────────────────────────────────
  h1: scale('manrope', 32, -0.5),
  h2: scale('manrope', 28, -0.25),
  h3: scale('manrope', 24, 0),
  h4: scale('manrope', 20, 0),
  subtitle1: scale('manrope', 18, 0),
  subtitle2: scale('manrope', 16, 0),
  button1: scale('manrope', 16, 0.5),
  button2: scale('manrope', 14, 0.5),
  caption: scale('manrope', 12, 0.4),

  // ── Nunito Sans scale ──────────────────────────────────────
  body1: scale('nunitoSans', 16, 0.15),
  body2: scale('nunitoSans', 14, 0.15),
  overline1: scale('nunitoSans', 12, 1.5),
  overline2: scale('nunitoSans', 10, 1.5),
} as const;

/**
 * AppTextStyles.textSize50ExtraBold — the one-off oversized headline on the
 * empty dashboard ("Tension mat lo hojayega!").
 */
export const textSize50ExtraBold: TextStyle = {
  fontFamily: Fonts.manrope.extraBold,
  fontSize: 50,
  letterSpacing: -1,
};
