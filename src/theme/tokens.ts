/**
 * Noor design tokens.
 * Palette: deep emerald + warm sand, restrained gold accent.
 * Surfaces are flat with 1px hairline borders; shadows reserved for real elevation.
 */

export const palette = {
  emerald: {
    950: '#07231F',
    900: '#0B3D35',
    800: '#0F4A40',
    700: '#135C50',
    600: '#18705F',
    500: '#1E8C78',
    400: '#35A88F',
    300: '#6FC4B0',
    200: '#A9DCCE',
    100: '#D8EFE7',
    50: '#EFF8F4',
  },
  sand: {
    500: '#C9A227',
    400: '#D9BC67',
    300: '#E6D29A',
    200: '#EFE2BC',
    100: '#F4ECD8',
    50: '#FAF6EC',
  },
  neutral: {
    950: '#101413',
    900: '#1B2221',
    800: '#2A3331',
    700: '#3D4845',
    600: '#55615E',
    500: '#6E7A77',
    400: '#8E9A96',
    300: '#B4BDB9',
    200: '#D3D9D6',
    100: '#E6EAE8',
    50: '#F5F7F6',
  },
  paper: '#FAF7F0',
  ink: '#1B2221',
  night: '#0C1210',
  black: '#000000',
  white: '#FFFFFF',
  danger: '#B34A3F',
  warning: '#A67C14',
};

export type ThemeMode = 'light' | 'dark' | 'amoled';

export interface ThemeColors {
  mode: ThemeMode;
  bg: string;
  bgElevated: string;
  bgSunken: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textOnEmphasis: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  hairline: string;
  hairlineStrong: string;
  placeholder: string;
  danger: string;
  warning: string;
  success: string;
  overlay: string;
  quranText: string;
  tajweed: {
    madd: string;
    qalqalah: string;
    ghunnah: string;
    ikhfa: string;
    hamzat: string;
  };
  scrim: string;
}

const light: ThemeColors = {
  mode: 'light',
  bg: palette.paper,
  bgElevated: '#FFFFFF',
  bgSunken: '#F1EBDE',
  card: '#FFFFFF',
  text: palette.ink,
  textSecondary: palette.neutral[600],
  textTertiary: palette.neutral[400],
  textOnEmphasis: palette.paper,
  primary: palette.emerald[800],
  primarySoft: palette.emerald[50],
  accent: palette.sand[500],
  accentSoft: palette.sand[100],
  hairline: 'rgba(16,20,19,0.10)',
  hairlineStrong: 'rgba(16,20,19,0.22)',
  placeholder: palette.neutral[300],
  danger: palette.danger,
  warning: palette.warning,
  success: palette.emerald[500],
  overlay: 'rgba(255,255,255,0.92)',
  quranText: '#201B10',
  tajweed: {
    madd: '#C0392B',
    qalqalah: '#1F618D',
    ghunnah: '#1E8449',
    ikhfa: '#7D6608',
    hamzat: '#8E44AD',
  },
  scrim: 'rgba(16,20,19,0.4)',
};

const dark: ThemeColors = {
  mode: 'dark',
  bg: palette.night,
  bgElevated: '#101713',
  bgSunken: '#0A0F0D',
  card: '#101713',
  text: '#E8ECE9',
  textSecondary: '#A9B4B0',
  textTertiary: '#6E7A76',
  textOnEmphasis: '#101713',
  primary: palette.emerald[400],
  primarySoft: 'rgba(53,168,143,0.14)',
  accent: palette.sand[400],
  accentSoft: 'rgba(217,188,103,0.14)',
  hairline: 'rgba(232,236,233,0.10)',
  hairlineStrong: 'rgba(232,236,233,0.24)',
  placeholder: palette.neutral[600],
  danger: '#D96A5E',
  warning: '#D9B45C',
  success: palette.emerald[400],
  overlay: 'rgba(12,18,16,0.92)',
  quranText: '#F2EBD8',
  tajweed: {
    madd: '#E07B6E',
    qalqalah: '#7FB3D5',
    ghunnah: '#82D4A4',
    ikhfa: '#D8BE6E',
    hamzat: '#C39BD3',
  },
  scrim: 'rgba(0,0,0,0.6)',
};

const amoled: ThemeColors = {
  ...dark,
  mode: 'amoled',
  bg: '#000000',
  bgElevated: '#050505',
  bgSunken: '#000000',
  card: '#050505',
  overlay: 'rgba(0,0,0,0.94)',
};

export const themes: Record<ThemeMode, ThemeColors> = { light, dark, amoled };

/* ------------------------------ type scale ------------------------------ */

export const type = {
  display: { fontSize: 34, lineHeight: 42 },
  title: { fontSize: 28, lineHeight: 36 },
  heading: { fontSize: 22, lineHeight: 30 },
  subheading: { fontSize: 18, lineHeight: 26 },
  body: { fontSize: 15, lineHeight: 23 },
  bodySmall: { fontSize: 13, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 17 },
  micro: { fontSize: 10, lineHeight: 14 },
  quran: { fontSize: 30, lineHeight: 46 },
  quranCompact: { fontSize: 25, lineHeight: 36 },
  quranWord: { fontSize: 21, lineHeight: 29 },
} as const;

export type TypeKey = keyof typeof type;

/* -------------------------------- spacing ------------------------------- */

export const space = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 48, 10: 64,
} as const;

/* -------------------------------- radius -------------------------------- */

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

/* ------------------------------- motion -------------------------------- */

export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;

export const fontStack = {
  ui: 'Inter',
  uiBold: 'Inter_700Bold',
  arabic: 'ScheherazadeNew_400Regular',
  arabicBold: 'ScheherazadeNew_700Bold',
  arabicAlt: 'ScheherazadeNew_400Regular',
  arabicAltBold: 'ScheherazadeNew_700Bold',
} as const;
