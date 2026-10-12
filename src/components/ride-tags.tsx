// Ride style tags: a row of bubbles to pick yours (Edit profile), and small
// read-only tags to show someone's (trip pages, requests, your profile).

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Body, Chip, ChipRow, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MAX_RIDE_TAGS, RIDE_TAGS, RideTag, rideTagLabels, toggleRideTag } from '@/lib/ride-tags';

export function RideTagPicker({ tags, onChange }: { tags: RideTag[]; onChange: (tags: RideTag[]) => void }) {
  const [full, setFull] = useState(false); // tried to pick a 5th
  return (
    <View style={{ gap: Spacing.xs }}>
      <ChipRow>
        {RIDE_TAGS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={tags.includes(option.value)}
            onPress={() => {
              const next = toggleRideTag(tags, option.value);
              setFull(next === null);
              if (next) onChange(next);
            }}
          />
        ))}
      </ChipRow>
      <Body muted style={{ fontSize: 13 }}>
        {full ? `You can pick up to ${MAX_RIDE_TAGS}. Tap one to remove it first.` : `Optional. Pick up to ${MAX_RIDE_TAGS}.`}
      </Body>
    </View>
  );
}

// Someone's tags as small grey pills. Shows nothing if they haven't picked any.
export function RideTags({ tags }: { tags: readonly string[] | null | undefined }) {
  const colors = useTheme();
  const labels = rideTagLabels(tags);
  if (labels.length === 0) return null;
  return (
    <View style={styles.tags} accessibilityLabel={`Ride style: ${labels.join(', ')}`}>
      {labels.map((label) => (
        <View key={label} style={[styles.tag, { backgroundColor: colors.track }]}>
          <Text style={[styles.tagText, { color: colors.text }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
