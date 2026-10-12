/**
 * Returns the color palette for the theme you picked (Profile → Theme) and the
 * phone's current light/dark setting.
 * https://docs.expo.dev/guides/color-schemes/
 */

import { ThemeColors, Themes } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeChoice } from '@/providers/theme-provider';

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  const { themeId } = useThemeChoice();
  const theme = Themes[themeId];
  return scheme === 'dark' ? theme.dark : theme.light;
}
