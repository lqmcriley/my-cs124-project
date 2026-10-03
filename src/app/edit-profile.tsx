// Edit profile: same form as setup, opened from the Profile tab.

import { router } from 'expo-router';

import { ProfileForm } from '@/components/profile-form';
import { Screen } from '@/components/ui';

export default function EditProfileScreen() {
  return (
    <Screen edges={['bottom']}>
      <ProfileForm submitLabel="Save changes" onSaved={() => router.back()} />
    </Screen>
  );
}
