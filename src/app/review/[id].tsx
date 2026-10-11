// Screen 9: Rate & review. After a trip, give each other person in the car
// 1–5 stars and an optional comment. One rating per person per trip.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { AnimatedItem } from '@/components/motion';
import { StarInput, starLabel } from '@/components/star-rating';
import { Body, Button, Card, ErrorText, Heading, Screen, Text, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchTripRiders } from '@/lib/booking-api';
import { errorHaptic, successHaptic } from '@/lib/haptics';
import { canReviewNow, peopleToReview, Reviewable } from '@/lib/reviews';
import { fetchMyReviewsForTrip, submitReviews } from '@/lib/reviews-api';
import { fetchTrip } from '@/lib/trips-api';
import { useAuth } from '@/providers/auth-provider';

type Draft = { rating: number; comment: string };

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const { session } = useAuth();
  const userId = session!.user.id;
  const [people, setPeople] = useState<Reviewable[] | null>(null); // people still to rate
  const [alreadyRated, setAlreadyRated] = useState(0);
  const [open, setOpen] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let stale = false;
    Promise.all([fetchTrip(id), fetchTripRiders(id), fetchMyReviewsForTrip(id, userId)])
      .then(([trip, riders, mine]) => {
        if (stale || !trip) return;
        const done = new Set(mine.map((review) => review.reviewee_id));
        setOpen(canReviewNow(trip));
        setAlreadyRated(done.size);
        setPeople(peopleToReview(trip, riders, userId).filter((person) => !done.has(person.id)));
      })
      .catch((err: Error) => {
        if (!stale) setError(err.message);
      });
    return () => {
      stale = true;
    };
  }, [id, userId]);

  function update(personId: string, change: Partial<Draft>) {
    setDrafts((current) => {
      const existing = current[personId] ?? { rating: 0, comment: '' };
      return { ...current, [personId]: { ...existing, ...change } };
    });
  }

  async function onSubmit() {
    const rated = Object.entries(drafts).filter(([, draft]) => draft.rating > 0);
    if (rated.length === 0) {
      setError('Tap the stars for at least one person.');
      errorHaptic();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await submitReviews(
        id,
        userId,
        rated.map(([revieweeId, draft]) => ({ revieweeId, rating: draft.rating, comment: draft.comment })),
      );
      successHaptic();
      router.back();
    } catch (err) {
      errorHaptic();
      setError(err instanceof Error ? err.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (people === null) {
    return (
      <Screen edges={['bottom']}>
        {error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: Spacing.xl }} />}
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Heading style={{ fontSize: 22 }}>How was the ride?</Heading>
      {!open ? (
        <Body muted>Ratings are open for 14 days after a trip leaves.</Body>
      ) : people.length === 0 ? (
        <Body muted>{alreadyRated > 0 ? "You've rated everyone in the car. Thanks!" : 'There was nobody else in the car to rate.'}</Body>
      ) : (
        <>
          <Body muted>Ratings are public and help other students know who to ride with. Be honest and kind.</Body>
          {people.map((person, index) => {
            const draft = drafts[person.id] ?? { rating: 0, comment: '' };
            return (
              <AnimatedItem key={person.id} index={index}>
                <Card>
                  <View style={styles.person}>
                    <Avatar uri={person.avatarUrl} name={person.name} size={48} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{person.name}</Text>
                      <Body muted style={{ fontSize: 13 }}>{person.role}</Body>
                    </View>
                  </View>
                  <View style={styles.stars}>
                    <StarInput value={draft.rating} onChange={(rating) => update(person.id, { rating })} />
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>{starLabel(draft.rating)}</Text>
                  </View>
                  {draft.rating > 0 && (
                    <TextField
                      label="Comment (optional)"
                      placeholder={person.role === 'Driver' ? 'e.g. Safe driver, left right on time' : 'e.g. On time and easy to ride with'}
                      value={draft.comment}
                      onChangeText={(comment) => update(person.id, { comment })}
                      multiline
                      maxLength={500}
                    />
                  )}
                </Card>
              </AnimatedItem>
            );
          })}
          <ErrorText>{error}</ErrorText>
          <Button title="Submit ratings" icon="star" onPress={onSubmit} loading={saving} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stars: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
});
