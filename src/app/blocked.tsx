// People you blocked, with an Unblock button for each.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/states';
import { Body, Button, Card, ErrorText, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { friendlyError } from '@/lib/errors';
import { tapHaptic } from '@/lib/haptics';
import { BlockedPerson, fetchBlockedPeople, unblockUser } from '@/lib/safety-api';
import { useAuth } from '@/providers/auth-provider';

export default function BlockedScreen() {
  const colors = useTheme();
  const { session } = useAuth();
  const userId = session!.user.id;
  const [people, setPeople] = useState<BlockedPerson[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(
    () =>
      fetchBlockedPeople(userId)
        .then(setPeople)
        .catch((err: Error) => setError(friendlyError(err))),
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function unblock(personId: string) {
    setBusy(personId);
    try {
      await unblockUser(userId, personId);
      tapHaptic();
      await load();
    } catch (err) {
      setError(friendlyError(err, "Couldn't unblock."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen edges={['bottom']}>
      <Body muted>Blocked people can&apos;t request your trips, and you won&apos;t see theirs. They aren&apos;t told.</Body>
      <ErrorText>{error}</ErrorText>
      {people === null ? (
        error ? null : <ActivityIndicator color={colors.primary} />
      ) : people.length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" title="Nobody blocked" message="If someone makes you uncomfortable, you can block them from their profile or trip." />
      ) : (
        people.map((person) => (
          <Card key={person.blocked_id}>
            <View style={styles.row}>
              <Avatar uri={person.blocked.avatar_url} name={person.blocked.full_name} size={44} />
              <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' }}>{person.blocked.full_name}</Text>
              <View style={{ width: 120 }}>
                <Button title="Unblock" variant="secondary" loading={busy === person.blocked_id} onPress={() => unblock(person.blocked_id)} />
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
});
