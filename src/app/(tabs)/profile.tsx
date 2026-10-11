// Your profile: photo, details, car, plus Edit and Sign out.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { CarIllustration } from '@/components/car-illustration';
import { ReliabilityBadge } from '@/components/reliability-badge';
import { VibeMeters } from '@/components/vibes';
import { Body, Button, Card, Heading, IconRow, Label, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { Reliability } from '@/lib/reliability';
import { fetchReliability } from '@/lib/reliability-api';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session, profile, car, payment, signOut } = useAuth();
  const [reliability, setReliability] = useState<Reliability | undefined>(undefined);
  const userId = session?.user.id;

  // Your own "Shows up X of Y trips", refreshed whenever you open this tab.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      fetchReliability([userId]).then((result) => setReliability(result[userId]));
    }, [userId]),
  );

  if (!profile) return null;

  const details = [profile.year, profile.major].filter(Boolean).join(' · ');

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Avatar uri={profile.avatar_url} name={profile.full_name} size={104} />
        <Heading>{profile.full_name}</Heading>
        {details ? <Body muted>{details}</Body> : null}
        <Body muted>{session?.user.email}</Body>
        <ReliabilityBadge stats={reliability} />
      </View>

      <Card>
        <Label>Reliability</Label>
        <Body muted>
          Everyone sees how often you show up. Cancelling more than 24 hours before a trip is free. Later cancels and no-shows count
          against you, so other students know who they can count on.
        </Body>
      </Card>

      <Card>
        <Label>About</Label>
        <Body>{profile.bio || 'No bio yet.'}</Body>
      </Card>

      <Card>
        <Label>Vibe check</Label>
        <VibeMeters profile={profile} />
      </Card>

      <Card>
        <Label>My car</Label>
        {car ? (
          <>
            <View style={{ alignItems: 'center' }}>
              <CarIllustration color={car.color} bodyType={car.body_type} width={220} />
            </View>
            <Body style={{ textAlign: 'center', fontWeight: '600' }}>
              {car.color} {car.make} {car.model}
            </Body>
            <Body muted style={{ textAlign: 'center' }}>
              Plate {car.plate} · {car.mpg} MPG · {car.seats} passenger {car.seats === 1 ? 'seat' : 'seats'}
            </Body>
          </>
        ) : (
          <Body muted>No car added. Add one in Edit profile if you want to drive.</Body>
        )}
      </Card>

      <Card>
        <Label>Payment</Label>
        {payment ? (
          <>
            {payment.venmo_username ? <IconRow icon="wallet-outline" text={`Venmo @${payment.venmo_username}`} /> : null}
            {payment.cashapp_cashtag ? <IconRow icon="cash-outline" text={`Cash App $${payment.cashapp_cashtag}`} /> : null}
            {payment.paypal_username ? <IconRow icon="logo-paypal" text={`PayPal.me/${payment.paypal_username}`} /> : null}
          </>
        ) : (
          <Body muted>Add Venmo, Cash App or PayPal in Edit profile so riders can pay you in one tap.</Body>
        )}
        <Body muted style={{ fontSize: 14 }}>
          Private: only riders on your trips will see these, when it&apos;s time to pay.
        </Body>
      </Card>

      <Button title="Edit profile" icon="create-outline" variant="secondary" onPress={() => router.push('/edit-profile')} />
      <Button
        title="Sign out"
        icon="log-out-outline"
        variant="danger"
        onPress={() =>
          Alert.alert('Sign out?', 'You can sign back in any time with your @illinois.edu email.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: signOut },
          ])
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
});
