/**
 * 1:1 port of lib/utility/common_color.dart.
 *
 * Flutter exposed these as `CommonColor.primaryColor({weight})` — a function
 * whose null weight meant "the base shade". Here the base lives at `primary`
 * and the ramp at `primary[100..900]`, which reads better at the call site and
 * costs no lookup. Values are unchanged; do not restyle.
 */
export const AppColors = {
  /** CommonColor.primaryColor() with no weight. */
  primary: '#004B64',
  /** CommonColor.textColor() with no weight. */
  text: '#140A09',

  white: '#FFFFFF',
  notificationBadge: '#DB4A4A',
  success500: '#17B26A',
  success50: '#ECFDF3',
  success300: '#75E0A7',
  error500: '#F04438',
  error600: '#D92D20',
  secondary100: '#ECF3F2',
} as const;

/** ColorExtension.primaryColor — the c100..c900 primary ramp. */
export const Primary = {
  c100: '#E6EDF0',
  c200: '#CCDBE0',
  c300: '#B3C9D1',
  c400: '#99B7C1',
  c500: '#80A5B2',
  c600: '#6693A2',
  c700: '#4D8193',
  c800: '#336F83',
  c900: '#1A5D74',
} as const;

/** ColorExtension.textColor — the c100..c900 text ramp. */
export const TextShade = {
  c100: '#E8E7E6',
  c200: '#D0CECE',
  c300: '#B9B6B5',
  c400: '#A19D9D',
  c500: '#8A8584',
  c600: '#726C6B',
  c700: '#5B5453',
  c800: '#433B3A',
  c900: '#2C2322',
} as const;

/**
 * AppTextStyles.greenGradient — the white → pale-green wash used behind
 * headers, the "trip in process" pill, and table title rows.
 * Flutter drew it topLeft → bottomRight; expo-linear-gradient takes the same
 * as start/end unit coordinates.
 */
export const GreenGradient = {
  colors: [AppColors.white, '#F0F5F5', '#E6EFEE'] as const,
  locations: [0, 0.5, 1] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;
