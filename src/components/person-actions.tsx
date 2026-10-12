// "Report" / "Block" for a driver or rider. Shows a small menu, then either
// opens the report form or blocks them after you confirm.

import { router } from 'expo-router';
import { Alert } from 'react-native';

import { friendlyError } from '@/lib/errors';
import { blockUser } from '@/lib/safety-api';

export function showPersonActions(input: { userId: string; personId: string; name: string; tripId?: string; onBlocked?: () => void }) {
  const { userId, personId, name, tripId, onBlocked } = input;
  Alert.alert(name, 'What would you like to do?', [
    {
      text: `Report ${name}`,
      onPress: () => router.push({ pathname: '/report/[id]', params: { id: personId, name, trip: tripId ?? '' } }),
    },
    {
      text: `Block ${name}`,
      style: 'destructive',
      onPress: () =>
        Alert.alert(
          `Block ${name}?`,
          "They won't be able to request your trips, you won't see theirs, and they won't be told. You can unblock them from your profile.",
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: () =>
                blockUser(userId, personId)
                  .then(() => {
                    Alert.alert('Blocked', `You won't see ${name}'s trips anymore.`);
                    onBlocked?.();
                  })
                  .catch((err: Error) => Alert.alert("Couldn't block", friendlyError(err))),
            },
          ],
        ),
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
