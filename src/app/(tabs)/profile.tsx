// Your profile: photo, details, car, plus Edit and Sign out.

import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Body, Button, Card, Heading, IconRow, Label, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session, profile, car, payment, signOut } = useAuth();
  if (!profile) return null;

  const details = [profile.year, profile.major].filter(Boolean).join(' · ');

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Avatar uri={profile.avatar_url} name={profile.full_name} size={104} />
        <Heading>{profile.full_name}</Heading>
        {details ? <Body muted>{details}</Body> : null}
        <Body muted>{session?.user.email}</Body>
      </View>

      <Card>
        <Label>About</Label>
        <Body>{profile.bio || 'No bio yet.'}</Body>
        <IconRow
          muted
          icon={profile.chat_preference === 'quiet' ? 'volume-mute-outline' : 'chatbubbles-outline'}
          text={profile.chat_preference === 'quiet' ? 'Prefers a quiet ride' : 'Down to talk'}
        />
      </Card>

      <Card>
        <Label>My car</Label>
        {car ? (
          <>
            <Body>
              {car.color} {car.make} {car.model}
            </Body>
            <Body muted>
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

      <Button title="Edit profile" variant="secondary" onPress={() => router.push('/edit-profile')} />
      <Button title="Sign out" variant="ghost" onPress={signOut} />
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
