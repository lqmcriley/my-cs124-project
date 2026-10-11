// Loading reliability totals from the database.

import type { Reliability } from './reliability';
import { supabase } from './supabase';

// Totals for many people in one request, keyed by user id.
export async function fetchReliability(userIds: string[]): Promise<Record<string, Reliability>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return {};
  const { data, error } = await supabase.rpc('reliability', { p_user_ids: unique });
  if (error) {
    console.warn("Couldn't load reliability", error.message);
    return {};
  }
  return Object.fromEntries((data as Reliability[]).map((row) => [row.user_id, row]));
}
