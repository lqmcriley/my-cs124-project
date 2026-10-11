-- How far each paying rider rides on a trip, so everyone can see the same fair
-- stretch-by-stretch gas split (see splitGasByRide in src/lib/pricing.ts).
-- Shares distances only (no names), and only with people on the trip.
-- Run this in the Supabase dashboard → SQL Editor after the Phase 5 migration.

create or replace function public.trip_split(p_trip_id uuid)
returns table (request_id uuid, rider_miles numeric, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.rider_miles, r.rider_id = auth.uid()
  from public.trip_requests r
  where r.trip_id = p_trip_id
    and (r.status = 'approved' or r.late_cancel) -- everyone who pays a share
    and (
      exists (select 1 from public.trips t where t.id = p_trip_id and t.driver_id = auth.uid())
      or exists (
        select 1 from public.trip_requests mine
        where mine.trip_id = p_trip_id and mine.rider_id = auth.uid() and (mine.status = 'approved' or mine.late_cancel)
      )
    );
$$;

revoke execute on function public.trip_split from public, anon;
grant execute on function public.trip_split to authenticated;
