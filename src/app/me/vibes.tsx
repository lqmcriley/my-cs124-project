// Profile → Vibe check: how you like a ride.

import { router } from 'expo-router';

import { Body, Button, Card, Screen } from '@/components/ui';
import { VibeMeters } from '@/components/vibes';
import { useAuth } from '@/providers/auth-provider';

export default function MyVibesScreen() {
  const { profile } = useAuth();
  if (!profile) return null;
  return (
    <Screen edges={['bottom']}>
      <Body muted>Riders and drivers see this on your trips, so you can find people who like the same kind of ride.</Body>
      <Card>
        <VibeMeters profile={profile} detailed />
      </Card>
      <Button title="Change my vibes" variant="secondary" onPress={() => router.push('/edit-profile')} />
    </Screen>
  );
}
