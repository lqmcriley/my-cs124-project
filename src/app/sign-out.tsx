// Sign out, as a sheet that springs up from the bottom (drag it down to close).
// Your photo pops in, then the choices slide up after it.

import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Body, Button, Heading } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { shortName } from '@/lib/format';
import { successHaptic } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-provider';

export default function SignOutSheet() {
  const colors = useTheme();
  const { profile, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const name = shortName(profile);

  return (
    <View style={[styles.sheet, { backgroundColor: colors.background }]}>
      <Animated.View entering={ZoomIn.springify().damping(20).stiffness(220)}>
        <Avatar uri={profile?.avatar_url} name={profile?.full_name ?? '?'} size={84} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(80).duration(220)} style={styles.text}>
        <Heading style={{ fontSize: 22, textAlign: 'center' }}>Heading out{name ? `, ${name}` : ''}?</Heading>
        <Body muted style={{ textAlign: 'center' }}>
          Your trips stay saved. Sign back in any time with your @illinois.edu email.
        </Body>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(160).duration(220)} style={styles.buttons}>
        <Button
          title="Sign out"
          icon="log-out-outline"
          variant="danger"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            successHaptic();
            await signOut();
          }}
        />
        <Button title="Stay signed in" variant="ghost" onPress={() => router.back()} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  text: {
    gap: Spacing.xs,
    alignItems: 'center',
  },
  buttons: {
    alignSelf: 'stretch',
    gap: Spacing.xs,
  },
});
