// Shared, subtle animations so every screen moves the same way.
// They automatically switch off when the phone's "Reduce Motion" setting is on.

import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Cards and list rows: fade in while sliding up a little. Items lower in a
// list start slightly later, so a list "cascades" in (capped so long lists stay quick).
export function enterItem(index = 0) {
  return FadeInDown.duration(220).delay(Math.min(index, 6) * 40);
}

// When items above move (one is added or removed), others glide to their new place.
export const glide = LinearTransition.duration(200);

// A list item that fades/slides in and glides when the list changes.
export function AnimatedItem({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={enterItem(index)} layout={glide} style={style}>
      {children}
    </Animated.View>
  );
}

// Cross-fades its contents whenever `value` changes, e.g. a price or a status.
export function FadeSwap({ value, children, style }: { value: string | number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View key={String(value)} entering={FadeIn.duration(180)} style={style}>
      {children}
    </Animated.View>
  );
}

// A Pressable that gently shrinks while held and springs back on release.
// Used by every button, chip and tappable card. Skipped when Reduce Motion is on.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  scaleTo?: number; // how small it gets while pressed (0.96 = 4% smaller)
};

export function PressableScale({ style, onPressIn, onPressOut, scaleTo = 0.96, children, ...props }: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        if (!reduceMotion) scale.set(withTiming(scaleTo, { duration: 90 }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withSpring(1, { damping: 14, stiffness: 260, mass: 0.6 }));
        onPressOut?.(event);
      }}
      style={[style, pressStyle]}>
      {children}
    </AnimatedPressable>
  );
}
