// Profile → Ride style: your tags, like "Quiet ride" or "Snack stops".

import { router } from 'expo-router';

import { RideTags } from '@/components/ride-tags';
import { Body, Button, Card, Screen } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function MyRideStyleScreen() {
  const { profile } = useAuth();
  const hasTags = (profile?.ride_tags?.length ?? 0) > 0;
  return (
    <Screen edges={['bottom']}>
      <Body muted>Riders and drivers see these on your trips, so you can find people who like the same kind of ride.</Body>
      <Card>{hasTags ? <RideTags tags={profile?.ride_tags} /> : <Body muted>You haven&apos;t picked any yet.</Body>}</Card>
      <Button title={hasTags ? 'Change my ride style' : 'Pick my ride style'} variant="secondary" onPress={() => router.push('/edit-profile')} />
    </Screen>
  );
}
