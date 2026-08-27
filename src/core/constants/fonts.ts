/**
 * Font family names as registered with expo-font.
 * RN bakes weight into the family name, unlike Flutter's fontFamily + fontWeight,
 * so `AppTextStyles.body1(TextWeight.bold, …)` becomes `Fonts.nunitoSans.bold`.
 */
export const Fonts = {
  manrope: {
    extraLight: 'Manrope-ExtraLight',
    light: 'Manrope-Light',
    regular: 'Manrope-Regular',
    medium: 'Manrope-Medium',
    semiBold: 'Manrope-SemiBold',
    bold: 'Manrope-Bold',
    extraBold: 'Manrope-ExtraBold',
  },
  nunitoSans: {
    light: 'NunitoSans-Light',
    regular: 'NunitoSans-Regular',
    // Nunito Sans ships no Medium file; Flutter's w500 resolved to SemiBold.
    medium: 'NunitoSans-SemiBold',
    semiBold: 'NunitoSans-SemiBold',
    bold: 'NunitoSans-Bold',
    extraBold: 'NunitoSans-ExtraBold',
    black: 'NunitoSans-Black',
  },
} as const;

export const FONT_ASSETS = {
  'Manrope-ExtraLight': require('../../../assets/fonts/Manrope-ExtraLight.ttf'),
  'Manrope-Light': require('../../../assets/fonts/Manrope-Light.ttf'),
  'Manrope-Regular': require('../../../assets/fonts/Manrope-Regular.ttf'),
  'Manrope-Medium': require('../../../assets/fonts/Manrope-Medium.ttf'),
  'Manrope-SemiBold': require('../../../assets/fonts/Manrope-SemiBold.ttf'),
  'Manrope-Bold': require('../../../assets/fonts/Manrope-Bold.ttf'),
  'Manrope-ExtraBold': require('../../../assets/fonts/Manrope-ExtraBold.ttf'),
  'NunitoSans-Light': require('../../../assets/fonts/NunitoSans-Light.ttf'),
  'NunitoSans-Regular': require('../../../assets/fonts/NunitoSans-Regular.ttf'),
  'NunitoSans-SemiBold': require('../../../assets/fonts/NunitoSans-SemiBold.ttf'),
  'NunitoSans-Bold': require('../../../assets/fonts/NunitoSans-Bold.ttf'),
  'NunitoSans-ExtraBold': require('../../../assets/fonts/NunitoSans-ExtraBold.ttf'),
  'NunitoSans-Black': require('../../../assets/fonts/NunitoSans-Black.ttf'),
} as const;
