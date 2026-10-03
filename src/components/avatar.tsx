// A round profile photo. Shows the person's initials if there's no photo.

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ uri, name, size = 64 }: { uri?: string | null; name: string; size?: number }) {
  const colors = useTheme();
  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={circle} contentFit="cover" accessibilityLabel={`Photo of ${name}`} />;
  }
  return (
    <View style={[styles.fallback, circle, { backgroundColor: colors.primary }]}>
      <Text style={{ color: colors.onPrimary, fontSize: size * 0.38, fontWeight: '800' }}>{initials(name) || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
