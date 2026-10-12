// Profile → Theme: pick the app's colors. Every theme uses Illinois colors.
// The choice is saved on this phone and applies right away.

import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/motion';
import { Body, Screen, Text } from '@/components/ui';
import { Radius, Spacing, ThemeId, Themes } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { selectionHaptic } from '@/lib/haptics';
import { useThemeChoice } from '@/providers/theme-provider';

export default function ThemeScreen() {
  const colors = useTheme();
  const scheme = useColorScheme();
  const { themeId, setThemeId } = useThemeChoice();

  return (
    <Screen edges={['bottom']}>
      <Body muted>Every theme uses Illinois colors. Dark mode follows your iPhone&apos;s setting.</Body>
      {(Object.keys(Themes) as ThemeId[]).map((id) => {
        const theme = Themes[id];
        const palette = scheme === 'dark' ? theme.dark : theme.light;
        const chosen = id === themeId;
        return (
          <PressableScale
            key={id}
            scaleTo={0.98}
            onPress={() => {
              selectionHaptic();
              setThemeId(id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: chosen }}
            accessibilityLabel={`${theme.name}: ${theme.description}`}
            style={[styles.card, { backgroundColor: colors.card, borderColor: chosen ? colors.selected : colors.border }, chosen && { borderWidth: 2 }]}>
            {/* A mini preview: the theme's background with a button and a selected bubble on it */}
            <View style={[styles.preview, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <View style={[styles.previewButton, { backgroundColor: palette.primary }]}>
                <Text style={{ color: palette.onPrimary, fontSize: 11, fontWeight: '700' }}>Post</Text>
              </View>
              <View style={[styles.previewChip, { backgroundColor: palette.selected }]}>
                <Text style={{ color: palette.onSelected, fontSize: 11, fontWeight: '600' }}>O&apos;Hare</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{theme.name}</Text>
              <Body muted style={{ fontSize: 14 }}>{theme.description}</Body>
            </View>
            {chosen && <Icon name="checkmark-circle" size={22} color={colors.selected} />}
          </PressableScale>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  preview: {
    width: 92,
    height: 64,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: 8,
    gap: 6,
    justifyContent: 'center',
  },
  previewButton: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    paddingVertical: 3,
  },
  previewChip: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
