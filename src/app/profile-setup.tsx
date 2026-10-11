// Screen 2: Profile setup. Shown once, right after your first sign-in.
// When you save, the root layout sees your new profile and opens the main app.

import { ProfileForm } from '@/components/profile-form';
import { Body, Button, Heading, Screen } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileSetupScreen() {
  const { signOut } = useAuth();
  return (
    <Screen>
      <Heading>Set up your profile</Heading>
      <Body muted>Drivers and riders see this before sharing a car, so a real photo and name help.</Body>
      <ProfileForm submitLabel="Save and continue" />
      <Button title="Sign out" icon="log-out-outline" variant="danger" onPress={signOut} />
    </Screen>
  );
}
