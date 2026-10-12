// Hitch Illini colors for light and dark mode, using the official
// Illini Orange (#FF5F05) and Illini Blue (#13294B), with white and black.
// Orange = actions (buttons). Blue = what you've selected (bubbles, switches, your seat).
// Buttons use blue text on orange because white on this orange is too faint to read easily.

import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#FF5F05', // Illini Orange
    onPrimary: '#13294B', // text drawn on top of orange
    selected: '#13294B', // Illini Blue: selected bubbles, switches, your seat
    onSelected: '#FFFFFF',
    text: '#13294B',
    textSecondary: '#5B6B82',
    background: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E3E5EA',
    inputBackground: '#FFFFFF',
    track: '#EEF0F4', // background of segmented controls
    danger: '#C62828',
    success: '#2E7D32',
  },
  dark: {
    primary: '#FF5F05', // Illini Orange
    onPrimary: '#13294B',
    selected: '#FFFFFF', // blue on blue would vanish, so selections turn white
    onSelected: '#13294B',
    text: '#FFFFFF',
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
