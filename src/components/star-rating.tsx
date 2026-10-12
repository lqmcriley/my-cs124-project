// Tap 1–5 stars. Each tap gives a small vibration tick.

import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/motion';
import { useTheme } from '@/hooks/use-theme';
import { selectionHaptic } from '@/lib/haptics';

const LABELS = ['', 'Bad', 'Not great', 'OK', 'Good', 'Great'];

export function StarInput({ value, onChange, size = 34 }: { value: number; onChange: (stars: number) => void; size?: number }) {
  const colors = useTheme();
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: 5, now: value, text: LABELS[value] }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <PressableScale
          key={star}
          scaleTo={0.85}
          hitSlop={4}
          onPress={() => {
            selectionHaptic();
            onChange(star);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${star} ${star === 1 ? 'star' : 'stars'}`}>
          <Icon name={star <= value ? 'star' : 'star-outline'} size={size} color={star <= value ? colors.primary : colors.textSecondary} />
        </PressableScale>
      ))}
    </View>
  );
}

export function starLabel(stars: number): string {
  return LABELS[stars] ?? '';
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
});
