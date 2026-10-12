// A Settings-style menu: rows grouped in one rounded list with thin lines
// between them. Each row has a title, an optional value on the right (like
// "2019 Honda Civic") and an arrow. Pressing a row dims it, nudges the arrow
// forward and gives a soft tap. Motion is skipped when Reduce Motion is on.

import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { Text } from '@/components/ui';
import { Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { selectionHaptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type RowProps = {
  title: string;
  value?: string | null; // shown on the right in grey
  onPress: () => void;
};

export function MenuRow({ title, value, onPress }: RowProps) {
  const colors = useTheme();
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0); // 0 = resting, 1 = pressed

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.get(), [0, 1], [colors.card, colors.track]),
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(pressed.get(), [0, 1], [0, 3]) }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => pressed.set(reduceMotion ? 1 : withTiming(1, { duration: 80 }))}
      onPressOut={() => pressed.set(reduceMotion ? 0 : withTiming(0, { duration: 220 }))}
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      style={[styles.row, rowStyle]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {value ? (
        <Text style={[styles.value, { color: colors.textSecondary }]} numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <Animated.View style={arrowStyle}>
        <Icon name="chevron-forward" size={17} color={colors.textSecondary} />
      </Animated.View>
    </AnimatedPressable>
  );
}

// One rounded list of MenuRows with thin lines between them.
export function MenuGroup({ children }: { children: ReactNode }) {
  const colors = useTheme();
  const rows = Children.toArray(children);
  return (
    <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {rows.map((row, index) => (
        <View key={index}>
          {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          {row}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: TapTarget + 4,
    paddingHorizontal: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    flex: 1,
    fontSize: 15,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md,
  },
});
