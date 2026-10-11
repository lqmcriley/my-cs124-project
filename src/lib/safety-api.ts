// Reporting and blocking people.

import { supabase } from './supabase';
import type { Profile, ReportReason } from './types';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'unsafe_driving', label: 'Unsafe driving' },
  { value: 'harassment', label: 'Harassment or rude behavior' },
  { value: 'no_show', label: "Didn't show up" },
  { value: 'payment', label: 'Payment problem' },
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'other', label: 'Something else' },
];

export async function reportUser(input: {
  reporterId: string;
  reportedId: string;
  tripId: string | null;
  reason: ReportReason;
  details: string;
}): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: input.reporterId,
    reported_id: input.reportedId,
    trip_id: input.tripId,
    reason: input.reason,
    details: input.details.trim() || null,
  });
  if (error) throw new Error(`Couldn't send your report: ${error.message}`);
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocks').upsert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw new Error(`Couldn't block: ${error.message}`);
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
  if (error) throw new Error(`Couldn't unblock: ${error.message}`);
}

export type BlockedPerson = { blocked_id: string; created_at: string; blocked: Pick<Profile, 'full_name' | 'avatar_url'> };

export async function fetchBlockedPeople(blockerId: string): Promise<BlockedPerson[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, created_at, blocked:profiles!blocks_blocked_id_fkey (full_name, avatar_url)')
    .eq('blocker_id', blockerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Couldn't load blocked people: ${error.message}`);
  return data as unknown as BlockedPerson[];
}

// Everyone you blocked or who blocked you, so their trips can be hidden.
export async function fetchBlockedIds(): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('blocked_user_ids');
  if (error) {
    console.warn("Couldn't load blocks", error.message);
    return new Set();
  }
  return new Set(data as string[]);
}

export type TripContact = { user_id: string; first_name: string; phone: string; role: 'driver' | 'rider' };

// Phone numbers of everyone else in the car (only for the driver and approved riders).
export async function fetchTripContacts(tripId: string): Promise<TripContact[]> {
  const { data, error } = await supabase.rpc('trip_contacts', { p_trip_id: tripId });
  if (error) {
    console.warn("Couldn't load phone numbers", error.message);
    return [];
  }
  return data as TripContact[];
}
