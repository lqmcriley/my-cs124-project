// Profile → Reviews: what people in the car said about you.

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { EmptyState } from '@/components/states';
import { Body, Card, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { shortName } from '@/lib/format';
import { fetchRecentReviews, ReviewWithReviewer } from '@/lib/reviews-api';
import { useAuth } from '@/providers/auth-provider';

export default function MyReviewsScreen() {
  const colors = useTheme();
  const { session } = useAuth();
  const userId = session!.user.id;
  const [reviews, setReviews] = useState<ReviewWithReviewer[] | null>(null);

  useEffect(() => {
    let stale = false;
    fetchRecentReviews(userId, 50).then((result) => {
      if (!stale) setReviews(result);
    });
    return () => {
      stale = true;
    };
  }, [userId]);

  return (
    <Screen edges={['bottom']}>
      {reviews === null ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.lg }} />
      ) : reviews.length === 0 ? (
        <EmptyState icon="star-outline" title="No reviews yet" message="After a trip, people in the car can rate each other. Reviews are public." />
      ) : (
        reviews.map((review) => (
          <Card key={review.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{'★'.repeat(review.rating)}</Text>
              <Body muted style={{ fontSize: 14 }}>
                {shortName(review.reviewer)} · {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Body>
            </View>
            {review.comment ? <Body>&ldquo;{review.comment}&rdquo;</Body> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
