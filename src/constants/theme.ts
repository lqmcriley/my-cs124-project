// Halfsies colors for light and dark mode.
// Brand: warm orange (#FF6B35) + deep navy (#13294B).
// Buttons use navy text on orange because white on this orange is too faint to read easily.

export const Colors = {
  light: {
    primary: '#FF6B35',
    onPrimary: '#13294B', // text drawn on top of orange
    text: '#13294B',
    textSecondary: '#5B6B82',
    background: '#FFF8F3',
    card: '#FFFFFF',
    border: '#EADFD6',
    inputBackground: '#FFFFFF',
    danger: '#C62828',
    success: '#2E7D32',
  },
  dark: {
    primary: '#FF7A4A',
    onPrimary: '#13294B',
    text: '#F4F6FA',
    textSecondary: '#A9B6CA',
    background: '#0B1A30',
    card: '#13294B',
    border: '#24406B',
    inputBackground: '#0F2140',
    danger: '#FF8A80',
    success: '#81C784',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  md: 12,
  lg: 20,
  pill: 999,
} as const;

// Minimum height for anything tappable (Apple recommends at least 44).
export const TapTarget = 52;
