// Reading and writing trips in Supabase.

import { supabase } from './supabase';
import type { TripWithDriver } from './types';
import type { toTripRow, toTripUpdate } from './trip-form';

// Load the driver's public profile and car alongside each trip.
export const TRIP_WITH_DRIVER = `
  *,
  driver:profiles (id, full_name, avatar_url, year, major, bio, chat_preference),
  car:cars (make, model, color, plate, seats)
`;

export async function fetchUpcomingTrips(): Promise<TripWithDriver[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_WITH_DRIVER)
    .eq('status', 'scheduled')
    .gt('departure_at', new Date().toISOString())
    .order('departure_at', { ascending: true })
    .limit(200);
  if (error) throw new Error(`Couldn't load trips: ${error.message}`);
  return data as TripWithDriver[];
}

export async function fetchTrip(id: string): Promise<TripWithDriver | null> {
  const { data, error } = await supabase.from('trips').select(TRIP_WITH_DRIVER).eq('id', id).maybeSingle();
  if (error) throw new Error(`Couldn't load this trip: ${error.message}`);
  return data as TripWithDriver | null;
}

export async function createTrip(row: ReturnType<typeof toTripRow>): Promise<string> {
  const { data, error } = await supabase.from('trips').insert(row).select('id').single();
  if (error) throw new Error(`Couldn't post your trip: ${error.message}`);
  return data.id as string;
}

export async function updateTrip(id: string, changes: ReturnType<typeof toTripUpdate>): Promise<void> {
  const { error } = await supabase.from('trips').update(changes).eq('id', id);
  if (error?.message.includes('trips_seats_booked_le_offered')) {
    throw new Error("You can't offer fewer seats than riders you've already approved.");
  }
  if (error) throw new Error(`Couldn't save your changes: ${error.message}`);
}
