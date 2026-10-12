// A heads-up on trips back to campus: flights and plans can run late, so keep a backup.

import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Body, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ReturnTripNote({ compact = false }: { compact?: boolean }) {
  const colors = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityRole="summary">
      <Icon name="information-circle-outline" size={20} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>Rides back can run late</Text>
        <Body muted style={{ fontSize: 14 }}>
          Flights get delayed and plans change. Drivers wait within their flexible window, and if a driver moves the trip
          a lot, riders can drop out for free.
          {compact ? '' : ' Keep a backup in mind, like the Peoria Charter bus from O’Hare and Midway, or Amtrak from Chicago Union Station.'}
        </Body>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.md,
  },
});
