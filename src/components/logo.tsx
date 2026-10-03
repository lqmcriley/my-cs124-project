// The Halfsies logo: a circle split in half (orange + navy), like a ride split two ways.

import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function Logo({ size = 96 }: { size?: number }) {
  const colors = useTheme();
  return (
    <View style={styles.wrapper} accessibilityRole="image" accessibilityLabel="Halfsies logo">
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[styles.half, { backgroundColor: '#FF6B35' }]} />
        <View style={[styles.half, { backgroundColor: '#13294B' }]} />
      </View>
      <Text style={[styles.wordmark, { color: colors.text }]}>Halfsies</Text>
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
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
});
