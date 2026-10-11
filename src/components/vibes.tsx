// Vibe check: sliders to set how you like a ride, and small meters to show it.

import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { selectionHaptic } from '@/lib/haptics';
import { VIBE_MAX, VIBES, vibeLabel, Vibes, vibesFrom } from '@/lib/vibes';

// All five sliders, for the profile form.
export function VibeSliders({ vibes, onChange }: { vibes: Vibes; onChange: (vibes: Vibes) => void }) {
  const colors = useTheme();
  return (
    <View style={{ gap: Spacing.lg }}>
      {VIBES.map((vibe) => {
        const value = vibes[vibe.key];
        return (
          <View key={vibe.key} style={{ gap: 2 }}>
            <View style={styles.spread}>
              <Text style={[styles.title, { color: colors.text }]}>{vibe.title}</Text>
              <Text style={[styles.current, { color: colors.primary }]}>{vibeLabel(vibe, value)}</Text>
            </View>
            <View style={styles.sliderRow}>
              <Ionicons name={vibe.lowIcon} size={20} color={value <= 1 ? colors.primary : colors.textSecondary} />
              <Slider
                style={{ flex: 1, height: 40 }}
                minimumValue={0}
                maximumValue={VIBE_MAX}
                step={1}
                value={value}
                onValueChange={(next) => {
                  const rounded = Math.round(next);
                  if (rounded !== value) {
                    selectionHaptic();
                    onChange({ ...vibes, [vibe.key]: rounded });
                  }
                }}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.track}
                thumbTintColor={colors.primary}
                accessibilityLabel={`${vibe.title}: ${vibeLabel(vibe, value)}`}
              />
              <Ionicons name={vibe.highIcon} size={20} color={value >= 3 ? colors.primary : colors.textSecondary} />
            </View>
            <View style={styles.spread}>
              <Text style={[styles.endLabel, { color: colors.textSecondary }]}>{vibe.low}</Text>
              <Text style={[styles.endLabel, { color: colors.textSecondary }]}>{vibe.high}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Read-only "vibe check" for someone else: a small track with a dot where they sit.
export function VibeMeters({ profile }: { profile: Parameters<typeof vibesFrom>[0] }) {
  const colors = useTheme();
  const vibes = vibesFrom(profile);
  return (
    <View style={{ gap: Spacing.sm }}>
      {VIBES.map((vibe) => {
        const value = vibes[vibe.key];
        return (
          <View key={vibe.key} style={styles.meterRow} accessibilityLabel={`${vibe.title}: ${vibeLabel(vibe, value)}`}>
            <Ionicons name={value >= 3 ? vibe.highIcon : vibe.lowIcon} size={16} color={colors.primary} />
            <Text style={[styles.meterTitle, { color: colors.textSecondary }]}>{vibe.title}</Text>
            <View style={[styles.track, { backgroundColor: colors.track }]}>
              <View style={[styles.dot, { backgroundColor: colors.primary, left: `${(value / VIBE_MAX) * 100}%` }]} />
            </View>
            <Text style={[styles.meterLabel, { color: colors.text }]} numberOfLines={1}>
              {vibeLabel(vibe, value)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  spread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  current: {
    fontSize: 14,
    fontWeight: '600',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  endLabel: {
    fontSize: 12,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  meterTitle: {
    width: 86,
    fontSize: 13,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: Radius.pill,
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
  },
  meterLabel: {
    width: 110,
    fontSize: 13,
    textAlign: 'right',
  },
});
