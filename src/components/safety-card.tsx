// Safety tools for anyone in the car: share trip details with a friend, and call 911.

import { Alert, Linking, Share, StyleSheet, View } from 'react-native';

import { Body, Button, Card, Label } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { tripShareMessage } from '@/lib/share';
import type { TripWithDriver } from '@/lib/types';

export function SafetyCard({ trip, arrival }: { trip: TripWithDriver; arrival: Date | null }) {
  function shareTrip() {
    // Opens the phone's share sheet: pick Messages, WhatsApp, etc.
    Share.share({ message: tripShareMessage(trip, arrival) }).catch(() => {});
  }

  function callEmergency() {
    Alert.alert('Call 911?', 'This will call emergency services right away.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
    ]);
  }

  return (
    <Card>
      <Label>Safety</Label>
      <Body muted style={{ fontSize: 14 }}>
        Let a friend know who you&apos;re riding with and where you&apos;re going.
      </Body>
      <View style={styles.buttons}>
        <View style={{ flex: 1 }}>
          <Button title="Share my trip" icon="share-outline" variant="secondary" onPress={shareTrip} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Call 911" icon="call" variant="danger" onPress={callEmergency} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
