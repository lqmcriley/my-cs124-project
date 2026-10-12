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
            <View style={[styles.spread, { gap: Spacing.sm }]}>
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

// Read-only "vibe check" for someone: each vibe gets its own two lines, so
// nothing gets cut off. Line 1: icon, name and the answer. Line 2: a bar of
// 5 steps with theirs highlighted. `detailed` (your Profile) also labels both ends.
export function VibeMeters({ profile, detailed = false }: { profile: Parameters<typeof vibesFrom>[0]; detailed?: boolean }) {
  const colors = useTheme();
  const vibes = vibesFrom(profile);
  return (
    <View style={{ gap: detailed ? Spacing.md : Spacing.sm + 4 }}>
      {VIBES.map((vibe) => {
        const value = vibes[vibe.key];
        return (
          <View key={vibe.key} style={{ gap: 6 }} accessibilityLabel={`${vibe.title}: ${vibeLabel(vibe, value)}`}>
            <View style={styles.meterHeader}>
              <View style={[styles.iconBubble, { backgroundColor: colors.track }]}>
                <Ionicons name={value >= 3 ? vibe.highIcon : vibe.lowIcon} size={15} color={colors.primary} />
              </View>
              <Text style={[styles.meterTitle, { color: colors.text }]}>{vibe.title}</Text>
              <Text style={[styles.meterLabel, { color: colors.primary }]}>{vibeLabel(vibe, value)}</Text>
            </View>
            <View style={styles.steps}>
              {Array.from({ length: VIBE_MAX + 1 }, (_, step) => (
                <View
                  key={step}
                  style={[styles.step, step === value ? { backgroundColor: colors.primary, height: 8 } : { backgroundColor: colors.track }]}
                />
              ))}
            </View>
            {detailed && (
              <View style={styles.spread}>
                <Text style={[styles.endLabel, { color: colors.textSecondary }]}>{vibe.low}</Text>
                <Text style={[styles.endLabel, { color: colors.textSecondary }]}>{vibe.high}</Text>
              </View>
            )}
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
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  endLabel: {
    fontSize: 12,
  },
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  meterLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 8,
  },
  step: {
    flex: 1,
    height: 5,
    borderRadius: Radius.pill,
  },
});
