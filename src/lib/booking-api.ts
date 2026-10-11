// Booking: seat requests, approvals and cancellations.
// Writes go through database functions (see supabase/migrations/*_phase3_booking.sql),
// which check every rule on the server.

import type { Place } from './config';
import type { PaymentMethods } from './payments';
import { supabase } from './supabase';
import { TRIP_WITH_DRIVER } from './trips-api';
import type { RequestWithRider, RequestWithTrip, TripRequest, TripRider, TripWithDriver } from './types';

export async function requestSeat(input: {
  tripId: string;
  dropoff: Place | null; // null = riding the whole way
  riderMiles: number | null;
  message: string;
  parkingAcknowledged: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('request_seat', {
    p_trip_id: input.tripId,
    p_rider_miles: input.riderMiles === null ? null : Math.round(input.riderMiles * 10) / 10,
    p_dropoff_name: input.dropoff?.name ?? null,
    p_dropoff_address: input.dropoff?.address ?? null,
    p_dropoff_lat: input.dropoff?.latitude ?? null,
    p_dropoff_lng: input.dropoff?.longitude ?? null,
    p_message: input.message.trim() || null,
    p_parking_acknowledged: input.parkingAcknowledged,
  });
  if (error) throw new Error(error.message);
}

export async function respondToRequest(requestId: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_to_request', { p_request_id: requestId, p_approve: approve });
  if (error) throw new Error(error.message);
}

export async function cancelRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_request', { p_request_id: requestId });
  if (error) throw new Error(error.message);
}

export async function cancelTrip(tripId: string): Promise<void> {
  const { error } = await supabase.from('trips').update({ status: 'cancelled' }).eq('id', tripId);
  if (error) throw new Error(`Couldn't cancel the trip: ${error.message}`);
}

// First name + photo of approved riders. Anyone signed in can see these.
export async function fetchTripRiders(tripId: string): Promise<TripRider[]> {
  const { data, error } = await supabase.rpc('trip_riders', { p_trip_id: tripId });
  if (error) throw new Error(`Couldn't load riders: ${error.message}`);
  return (data ?? []) as TripRider[];
}

// Driver: every request for one of your trips, newest first.
export async function fetchRequestsForTrip(tripId: string): Promise<RequestWithRider[]> {
  const { data, error } = await supabase
    .from('trip_requests')
    .select('*, rider:profiles (*)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Couldn't load requests: ${error.message}`);
  return data as RequestWithRider[];
}

// Rider: your latest request on this trip, if any.
export async function fetchMyRequest(tripId: string, userId: string): Promise<TripRequest | null> {
  const { data, error } = await supabase
    .from('trip_requests')
    .select('*')
    .eq('trip_id', tripId)
    .eq('rider_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load your request: ${error.message}`);
  return data as TripRequest | null;
}

export type MyTrips = {
  driving: (TripWithDriver & { pendingCount: number })[];
  riding: RequestWithTrip[];
};

// Everything for the My trips tab.
export async function fetchMyTrips(userId: string): Promise<MyTrips> {
  const [drivingResult, ridingResult] = await Promise.all([
    supabase.from('trips').select(TRIP_WITH_DRIVER).eq('driver_id', userId).order('departure_at', { ascending: true }),
    supabase
      .from('trip_requests')
      .select(`*, trip:trips (${TRIP_WITH_DRIVER})`)
      .eq('rider_id', userId)
      // Hide cancelled requests, except late cancels: those riders still owe their share.
      .or('status.neq.cancelled,late_cancel.eq.true')
      .order('created_at', { ascending: false }),
  ]);
  if (drivingResult.error) throw new Error(`Couldn't load your trips: ${drivingResult.error.message}`);
  if (ridingResult.error) throw new Error(`Couldn't load your rides: ${ridingResult.error.message}`);

  const driving = drivingResult.data as TripWithDriver[];
  // Count requests waiting for an answer on each of your trips.
  const pending: Record<string, number> = {};
  if (driving.length > 0) {
    const { data, error } = await supabase
      .from('trip_requests')
      .select('trip_id')
      .eq('status', 'pending')
      .in('trip_id', driving.map((trip) => trip.id));
    if (error) throw new Error(`Couldn't load requests: ${error.message}`);
    for (const row of data) pending[row.trip_id] = (pending[row.trip_id] ?? 0) + 1;
  }

  return {
    driving: driving.map((trip) => ({ ...trip, pendingCount: pending[trip.id] ?? 0 })),
    riding: ridingResult.data as RequestWithTrip[],
  };
}

// The driver's Venmo / Cash App / PayPal, only returned to approved riders of this trip.
export async function fetchPaymentHandles(tripId: string): Promise<PaymentMethods | null> {
  const { data, error } = await supabase.rpc('trip_payment_handles', { p_trip_id: tripId });
  if (error) throw new Error(`Couldn't load payment options: ${error.message}`);
  const row = (data ?? [])[0] as PaymentMethods | undefined;
  return row ?? null;
}

// Driver: mark a rider as paid (or undo it).
export async function setRequestPaid(requestId: string, paid: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_request_paid', { p_request_id: requestId, p_paid: paid });
  if (error) throw new Error(error.message);
}

// Driver: after the trip, mark a rider who never came (or undo it).
export async function setNoShow(requestId: string, noShow: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_no_show', { p_request_id: requestId, p_no_show: noShow });
  if (error) throw new Error(error.message);
}

// Rider: after the trip, report that the driver never came (or undo it).
export async function reportDriverNoShow(tripId: string, noShow: boolean): Promise<void> {
  const { error } = await supabase.rpc('report_driver_no_show', { p_trip_id: tripId, p_no_show: noShow });
  if (error) throw new Error(error.message);
}

export type SplitRow = { request_id: string; rider_miles: number | null; is_me: boolean };

// How far every paying rider rides (no names), for the fair gas split.
// Only returned to the driver and paying riders on this trip.
export async function fetchTripSplit(tripId: string): Promise<SplitRow[]> {
  const { data, error } = await supabase.rpc('trip_split', { p_trip_id: tripId });
  if (error) {
    console.warn("Couldn't load the gas split", error.message);
    return [];
  }
  return data as SplitRow[];
}
