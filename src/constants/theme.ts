// Hitch Illini color themes, all built from Illinois colors (never another
// school's): official Illini Orange (#FF5F05) and Illini Blue (#13294B), plus
// whites, blacks and Altgeld's burnt orange. Each theme has a light and a dark version.
// primary = actions (buttons); selected = what you've picked (bubbles, switches, your seat).
// "on" colors are the text drawn on top of them, chosen so it's easy to read.

import { Platform } from 'react-native';

const shared = {
  light: { danger: '#C62828', success: '#2E7D32' },
  dark: { danger: '#FF8A80', success: '#81C784' },
};

const classic = {
  light: {
    primary: '#FF5F05', // Illini Orange
    onPrimary: '#13294B',
    selected: '#13294B', // Illini Blue
    onSelected: '#FFFFFF',
    text: '#13294B',
    textSecondary: '#5B6B82',
    background: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E3E5EA',
    inputBackground: '#FFFFFF',
    track: '#EEF0F4', // background of segmented controls
    ...shared.light,
  },
  dark: {
    primary: '#FF5F05',
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
    ...shared.dark,
  },
};

// Named for the student section: orange everywhere.
const krush = {
  light: {
    ...classic.light,
    selected: '#FF5F05',
    onSelected: '#13294B',
    textSecondary: '#6B5D55',
    border: '#F3D9C9',
    track: '#FFEDE2',
  },
  dark: {
    ...classic.dark,
    selected: '#FF5F05',
    onSelected: '#13294B',
    textSecondary: '#C9B8AC',
    background: '#0E0B09',
    card: '#1C1612',
    border: '#3A2A20',
    inputBackground: '#16110E',
    track: '#2A1F18',
  },
};

// Named for Altgeld Hall: deeper burnt orange, warm off-white.
const altgeld = {
  light: {
    ...classic.light,
    primary: '#C84113',
    onPrimary: '#FFFFFF',
    textSecondary: '#6A5E55',
    background: '#FBF8F4',
    border: '#E8DFD5',
    track: '#F1EAE2',
  },
  dark: {
    ...classic.dark,
    primary: '#D4531F',
    onPrimary: '#FFFFFF',
    selected: '#F7F2EC',
    text: '#F7F2EC',
    textSecondary: '#BFB2A6',
    background: '#15110E',
    card: '#211A15',
    border: '#3B3029',
    inputBackground: '#1A1511',
    track: '#2D241E',
  },
};

// Memorial Stadium under the lights: blue buttons, orange selections.
const memorial = {
  light: {
    ...classic.light,
    primary: '#13294B',
    onPrimary: '#FFFFFF',
    selected: '#FF5F05',
    onSelected: '#13294B',
  },
  dark: {
    ...classic.dark,
    primary: '#3D7BD9',
    onPrimary: '#FFFFFF',
    selected: '#FF5F05',
    onSelected: '#13294B',
    background: '#07142A',
    card: '#0F2342',
    border: '#22406C',
    inputBackground: '#0B1B35',
    track: '#183357',
  },
};

export const Themes = {
  classic: { name: 'Illini Classic', description: 'Orange buttons, blue selections', ...classic },
  krush: { name: 'Orange Krush', description: 'Orange everywhere', ...krush },
  altgeld: { name: 'Altgeld', description: 'Burnt orange and warm white', ...altgeld },
  memorial: { name: 'Memorial Night', description: 'Blue buttons, orange selections', ...memorial },
} as const;

export type ThemeId = keyof typeof Themes;

// The brand colors (logo, map pins). Same in every theme.
export const Colors = classic;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// Rounded shapes also set borderCurve: 'continuous', Apple's smooth "squircle"
// corner (like app icons and iOS buttons) instead of a plain circular arc.
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
