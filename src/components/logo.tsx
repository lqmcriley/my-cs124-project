// The Hitch Illini logo: a circle split in half (orange + navy), like a ride split two ways.

import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Logo({ size = 96 }: { size?: number }) {
  const colors = useTheme();
  return (
    <View style={styles.wrapper} accessibilityRole="image" accessibilityLabel="Hitch Illini logo">
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[styles.half, { backgroundColor: Colors.light.primary }]} />
        <View style={[styles.half, { backgroundColor: Colors.light.text }]} />
      </View>
      <Text style={[styles.wordmark, { color: colors.text }]}>Hitch Illini</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 12,
  },
  circle: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  half: {
    flex: 1,
  },
  wordmark: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
});
