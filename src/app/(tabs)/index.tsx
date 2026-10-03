// Screen 3: Home (find a ride). For now it's a welcome placeholder.
// Phase 2 adds the From/To search, date picker, quick-pick chips, and trip results.

import { Body, Card, Heading, Screen } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function HomeScreen() {
  const { profile } = useAuth();
  const firstName = profile?.full_name.split(' ')[0] ?? 'there';

  return (
    <Screen edges={['top']}>
      <Heading>Hey {firstName} 👋</Heading>
      <Body muted>Where are you headed?</Body>
      <Card>
        <Body style={{ fontWeight: '700' }}>Trip search is coming next</Body>
        <Body muted>
          In Phase 2 you&apos;ll be able to search for rides to Chicago, O&apos;Hare, Indy, St. Louis and more, and
          drivers will be able to post trips.
        </Body>
      </Card>
    </Screen>
  );
}
