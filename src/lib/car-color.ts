// Turns the car color a driver typed ("Silver", "dark blue", "Maroon") into a
// paint color for the car illustration. Unknown colors get a neutral gray.

const BASE_COLORS: Record<string, string> = {
  black: '#1F2328',
  white: '#F4F5F7',
  silver: '#B9BEC6',
  gray: '#7D848D',
  grey: '#7D848D',
  charcoal: '#3D4248',
  red: '#C8102E',
  maroon: '#6E1423',
  burgundy: '#6E1423',
  orange: '#FF6B35',
  yellow: '#F2C230',
  gold: '#C9A64B',
  champagne: '#D9C7A3',
  beige: '#D4C2A0',
  tan: '#C8A97E',
  brown: '#6B4A33',
  bronze: '#8C6239',
  green: '#2E7D4F',
  teal: '#167D7F',
  blue: '#2563C9',
  navy: '#13294B',
  purple: '#6A3FA0',
  pink: '#E27BA6',
};

const FALLBACK = '#9AA3AE';

export function adjust(hex: string, amount: number): string {
  // amount > 0 lightens, < 0 darkens (mixes toward white or black).
  const target = amount > 0 ? 255 : 0;
  const mix = (channel: number) => Math.round(channel + (target - channel) * Math.abs(amount));
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return '#' + [mix(r), mix(g), mix(b)].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function carColorHex(name: string | null | undefined): string {
  const words: string[] = (name ?? '').toLowerCase().match(/[a-z]+/g) ?? [];
  // Use the last color word: "metallic dark blue" -> blue.
  const colorWord = [...words].reverse().find((word) => word in BASE_COLORS);
  if (!colorWord) return FALLBACK;
  const base = BASE_COLORS[colorWord];
  if (words.includes('dark') || words.includes('deep')) return adjust(base, -0.35);
  if (words.includes('light') || words.includes('pale') || words.includes('baby')) return adjust(base, 0.4);
  return base;
}
