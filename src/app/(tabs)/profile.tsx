// Your profile: photo, details, car, plus Edit and Sign out.

import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Body, Button, Card, Heading, Label, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session, profile, car, signOut } = useAuth();
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
        <Body muted>{profile.chat_preference === 'quiet' ? '🤫 Prefers a quiet ride' : '💬 Down to talk'}</Body>
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
