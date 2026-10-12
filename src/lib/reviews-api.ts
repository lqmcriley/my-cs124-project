// Loading and saving reviews.

import type { RatingSummary } from './reviews';
import { supabase } from './supabase';
import type { Review } from './types';

// Average rating and count for many people in one request, keyed by user id.
export async function fetchRatingSummary(userIds: string[]): Promise<Record<string, RatingSummary>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return {};
  const { data, error } = await supabase.rpc('rating_summary', { p_user_ids: unique });
  if (error) {
    console.warn("Couldn't load ratings", error.message);
    return {};
  }
  return Object.fromEntries((data as RatingSummary[]).map((row) => [row.user_id, row]));
}

// The reviews you already left on this trip (so we don't ask twice).
export async function fetchMyReviewsForTrip(tripId: string, userId: string): Promise<Review[]> {
  const { data, error } = await supabase.from('reviews').select('*').eq('trip_id', tripId).eq('reviewer_id', userId);
  if (error) {
    console.warn("Couldn't load your reviews", error.message);
    return [];
  }
  return data as Review[];
}

export type ReviewWithReviewer = Review & { reviewer: { full_name: string; short_name?: string | null; avatar_url: string | null } };

// The latest reviews about someone, with the reviewer's name and photo.
export async function fetchRecentReviews(userId: string, limit = 5): Promise<ReviewWithReviewer[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey (full_name, short_name, avatar_url)')
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("Couldn't load reviews", error.message);
    return [];
  }
  return data as ReviewWithReviewer[];
}

export async function submitReviews(
  tripId: string,
  reviewerId: string,
  reviews: { revieweeId: string; rating: number; comment: string }[],
): Promise<void> {
  if (reviews.length === 0) return;
  const { error } = await supabase.from('reviews').insert(
    reviews.map((review) => ({
      trip_id: tripId,
      reviewer_id: reviewerId,
      reviewee_id: review.revieweeId,
      rating: review.rating,
      comment: review.comment.trim() || null,
    })),
  );
  if (error) throw new Error(`Couldn't save your ratings: ${error.message}`);
}
