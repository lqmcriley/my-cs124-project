// A card that folds open and closed. Closed, it shows a one-line summary of
// what's inside (e.g. "Fri, Oct 17 · 9:00 AM · ±30 min"); tap to open.

import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { glide, PressableScale } from '@/components/motion';
import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  summary: string; // shown under the title, open or closed
  open: boolean;
  onToggle: () => void;
  hasError?: boolean; // red outline if something inside needs fixing
  children: ReactNode;
};

export function FoldSection({ title, icon, summary, open, onToggle, hasError, children }: Props) {
  const colors = useTheme();
  return (
    <Animated.View
      layout={glide}
      style={[styles.card, { backgroundColor: colors.card, borderColor: hasError ? colors.danger : colors.border }]}>
      <PressableScale
        scaleTo={0.98}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}: ${summary}`}
        style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: colors.track }]}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.summary, { color: hasError ? colors.danger : colors.textSecondary }]} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
      </PressableScale>
      {open && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.body}>
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    minHeight: 64,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  summary: {
    fontSize: 14,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
});
