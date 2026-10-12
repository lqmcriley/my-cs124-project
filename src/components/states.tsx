// What a screen shows when it has nothing to show yet:
//   EmptyState    "No rides yet", with an icon and an optional next step
//   LoadError     "Couldn't load", with a Try again button
//   SkeletonList  grey placeholder cards that gently pulse while loading

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Body, Button, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = keyof typeof Ionicons.glyphMap;

type Action = { title: string; icon?: IconName; onPress: () => void };

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message: string; action?: Action }) {
  const colors = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(220)} style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.track }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Body muted style={styles.message}>
        {message}
      </Body>
      {action && (
        <View style={styles.action}>
          <Button title={action.title} icon={action.icon} variant="secondary" onPress={action.onPress} />
        </View>
      )}
    </Animated.View>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Couldn't load this"
      message={message}
      action={{ title: 'Try again', icon: 'refresh', onPress: onRetry }}
    />
  );
}

// Placeholder cards shaped like trip cards, shown while trips load.
export function SkeletonList({ count = 3 }: { count?: number }) {
  const colors = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!reduceMotion) opacity.set(withRepeat(withTiming(0.45, { duration: 750 }), -1, true));
  }, [opacity, reduceMotion]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const bar = (width: `${number}%`, height = 12) => (
    <View style={{ width, height, borderRadius: Radius.pill, backgroundColor: colors.track }} />
  );

  return (
    <Animated.View
      style={[styles.list, pulse]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.skeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: colors.track }]} />
            <View style={{ flex: 1, gap: Spacing.sm }}>
              {bar('70%', 14)}
              {bar('45%')}
            </View>
          </View>
          {bar('90%')}
          {bar('60%')}
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: Spacing.xs,
  },
  list: {
    gap: Spacing.md,
  },
  skeleton: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
