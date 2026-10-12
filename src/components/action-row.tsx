// A tappable menu row (Profile: Edit profile, Blocked people, Sign out).
// Pressing it shrinks the row a little, and the icon pops and tilts with a
// small vibration, so it feels alive. Motion is skipped when Reduce Motion is on.

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/motion';
import { Text } from '@/components/ui';
import { Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tapHaptic } from '@/lib/haptics';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  tone?: 'primary' | 'neutral' | 'danger';
  onPress: () => void;
};

const POP = { damping: 9, stiffness: 320, mass: 0.6 };

export function ActionRow({ icon, title, subtitle, tone = 'neutral', onPress }: Props) {
  const colors = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const tilt = useSharedValue(0);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }, { rotate: `${tilt.get()}deg` }],
  }));

  const accent = tone === 'danger' ? colors.danger : tone === 'primary' ? colors.primary : colors.text;
  // A soft tint of the accent color behind the icon (hex + alpha).
  const tint = tone === 'neutral' ? colors.track : `${accent}22`;

  return (
    <PressableScale
      scaleTo={0.97}
      onPressIn={() => {
        if (reduceMotion) return;
        scale.set(withSpring(1.18, POP));
        tilt.set(withSequence(withTiming(-10, { duration: 90 }), withSpring(0, POP)));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, POP));
      }}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={styles.row}>
      <Animated.View style={[styles.iconBubble, { backgroundColor: tint }, iconStyle]}>
        <Ionicons name={icon} size={20} color={accent} />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: tone === 'danger' ? colors.danger : colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </PressableScale>
  );
}

// A card that holds ActionRows with thin lines between them.
export function ActionGroup({ children }: { children: ReactNode[] }) {
  const colors = useTheme();
  return (
    <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children.map((child, index) => (
        <View key={index}>
          {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: TapTarget + 16,
    paddingVertical: Spacing.sm,
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 38 + Spacing.md,
  },
});
