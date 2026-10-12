// Your profile: photo, details, car, plus Edit and Sign out.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionGroup, ActionRow } from '@/components/action-row';
import { Avatar } from '@/components/avatar';
import { AnimatedItem } from '@/components/motion';
import { CarIllustration } from '@/components/car-illustration';
import { ReliabilityBadge } from '@/components/reliability-badge';
import { VibeMeters } from '@/components/vibes';
import { Badge, Body, Card, Heading, IconRow, Label, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { Reliability } from '@/lib/reliability';
import { fetchReliability } from '@/lib/reliability-api';
import { formatRating, RatingSummary } from '@/lib/reviews';
import { fetchRatingSummary, fetchRecentReviews, ReviewWithReviewer } from '@/lib/reviews-api';
import { firstName } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { carName, efficiencyText, fuelTag } from '@/lib/fuel';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const colors = useTheme();
  const { session, profile, car, payment } = useAuth();
  const [reliability, setReliability] = useState<Reliability | undefined>(undefined);
  const [rating, setRating] = useState<RatingSummary | undefined>(undefined);
  const [reviews, setReviews] = useState<ReviewWithReviewer[]>([]);
  const userId = session?.user.id;

  // Your own "Shows up X of Y trips", refreshed whenever you open this tab.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      fetchReliability([userId]).then((result) => setReliability(result[userId]));
      fetchRatingSummary([userId]).then((result) => setRating(result[userId]));
      fetchRecentReviews(userId, 3).then(setReviews);
    }, [userId]),
  );

  if (!profile) return null;

  const details = [profile.year, profile.major].filter(Boolean).join(' · ');

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Avatar uri={profile.avatar_url} name={profile.full_name} size={104} />
        <Heading>{profile.full_name}</Heading>
        {details ? <Body muted>{details}</Body> : null}
        <Body muted>{session?.user.email}</Body>
        <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
          {formatRating(rating) && <Badge label={formatRating(rating)!} tone="waiting" />}
          <ReliabilityBadge stats={reliability} />
        </View>
      </View>

      <AnimatedItem index={1}>
        <ActionGroup>
          {[
            <ActionRow
              key="edit"
              icon="create-outline"
              tone="primary"
              title="Edit profile"
              subtitle="Photo, car, seats, vibes, payment"
              onPress={() => router.push('/edit-profile')}
            />,
            <ActionRow key="blocked" icon="ban-outline" title="Blocked people" subtitle="People you never ride with" onPress={() => router.push('/blocked')} />,
            <ActionRow key="sign-out" icon="log-out-outline" tone="danger" title="Sign out" onPress={() => router.push('/sign-out')} />,
          ]}
        </ActionGroup>
      </AnimatedItem>

      <Card>
        <Label>Reliability</Label>
        <Body muted>
          Everyone sees how often you show up. Cancelling more than 24 hours before a trip is free. Later cancels and no-shows count
          against you, so other students know who they can count on.
        </Body>
      </Card>

      <Card>
        <Label>About</Label>
        <Body>{profile.bio || 'No bio yet.'}</Body>
      </Card>

      <Card>
        <Label>Vibe check</Label>
        <VibeMeters profile={profile} detailed />
      </Card>

      <Card>
        <Label>My car</Label>
        {car ? (
          <>
            <View style={{ alignItems: 'center' }}>
              <CarIllustration color={car.color} bodyType={car.body_type} width={220} />
            </View>
            <Body style={{ textAlign: 'center', fontWeight: '600' }}>{carName(car)}</Body>
            <Body muted style={{ textAlign: 'center' }}>
              {[`Plate ${car.plate}`, efficiencyText(car.mpg, car.fuel), fuelTag(car.fuel), `${car.seats} passenger ${car.seats === 1 ? 'seat' : 'seats'}`]
                .filter(Boolean)
                .join(' · ')}
            </Body>
            {!car.model_year && <Body muted style={{ textAlign: 'center' }}>Add your car&apos;s year and fuel in Edit profile.</Body>}
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

      <Card>
        <Label>What people say</Label>
        {reviews.length === 0 ? (
          <Body muted>No reviews yet. After a trip, people in the car can rate each other.</Body>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={{ gap: 2 }}>
              <Body style={{ fontWeight: '600' }}>
                {'★'.repeat(review.rating)}
                <Text style={{ color: colors.textSecondary, fontWeight: '400' }}> · {firstName(review.reviewer.full_name)}</Text>
              </Body>
              {review.comment ? <Body muted>&ldquo;{review.comment}&rdquo;</Body> : null}
            </View>
          ))
        )}
      </Card>

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
