// Profile → Reliability: how often you show up, and how it's counted.

import { useEffect, useState } from 'react';

import { ReliabilityBadge } from '@/components/reliability-badge';
import { Body, Card, IconRow, Label, Screen } from '@/components/ui';
import type { Reliability } from '@/lib/reliability';
import { fetchReliability } from '@/lib/reliability-api';
import { useAuth } from '@/providers/auth-provider';

export default function MyReliabilityScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [stats, setStats] = useState<Reliability | undefined>(undefined);

  useEffect(() => {
    let stale = false;
    fetchReliability([userId]).then((result) => {
      if (!stale) setStats(result[userId]);
    });
    return () => {
      stale = true;
    };
  }, [userId]);

  return (
    <Screen edges={['bottom']}>
      <Card>
        <ReliabilityBadge stats={stats} />
        {stats && (
          <>
            <IconRow icon="checkmark-circle-outline" text={`${stats.completed} ${stats.completed === 1 ? 'trip' : 'trips'} completed`} />
            <IconRow icon="time-outline" text={`${stats.late_cancels} late ${stats.late_cancels === 1 ? 'cancel' : 'cancels'}`} />
            <IconRow icon="close-circle-outline" text={`${stats.no_shows} ${stats.no_shows === 1 ? 'no-show' : 'no-shows'}`} />
          </>
        )}
      </Card>
      <Card>
        <Label>How it works</Label>
        <Body muted>
          Everyone sees how often you show up. Cancelling more than 24 hours before a trip is free. Later cancels and no-shows
          count against you, so other students know who they can count on. If a driver moves a trip a lot, leaving is free.
        </Body>
      </Card>
    </Screen>
  );
}
