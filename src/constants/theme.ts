// Hitch Illini colors for light and dark mode.
// Brand: warm orange (#FF6B35) + deep navy (#13294B).
// Buttons use navy text on orange because white on this orange is too faint to read easily.

import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#FF6B35',
    onPrimary: '#13294B', // text drawn on top of orange
    text: '#13294B',
    textSecondary: '#5B6B82',
    background: '#F5F5F7', // neutral light gray (not peach)
    card: '#FFFFFF',
    border: '#E3E5EA',
    inputBackground: '#FFFFFF',
    track: '#E8E9EE', // background of segmented controls
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
    track: '#1B3459',
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
  md: 12, // text fields
  lg: 16, // cards
  pill: 999, // buttons, chips, search bars, segmented controls
} as const;

// Minimum height for buttons and fields (Apple recommends at least 44).
export const TapTarget = 48;

// Helvetica Neue is built into iPhones. Android has no Helvetica, so it uses
// its standard system font, which looks very close.
export const FontFamily = Platform.select({ ios: 'Helvetica Neue', default: undefined });
