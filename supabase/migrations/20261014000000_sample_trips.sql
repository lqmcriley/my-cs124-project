-- Phase 6: sample trips for demos. They show a "Sample" tag and nobody can
-- request a seat on them. Add them with supabase/seed/sample_trips.sql and
-- remove them all with supabase/seed/remove_sample_trips.sql.
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.

alter table public.trips
  add column is_sample boolean not null default false;

-- Only the SQL Editor (where nobody is signed in) can make a sample trip.
-- Anything posted from the app is always a real trip.
create or replace function public.trips_never_sample_from_app()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.is_sample := false;
  end if;
  return new;
end;
$$;

create trigger trips_never_sample_from_app
  before insert on public.trips
  for each row execute function public.trips_never_sample_from_app();

-- Seat requests on sample trips are refused.
create or replace function public.refuse_sample_trip_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.trips where id = new.trip_id and is_sample) then
    raise exception 'This is a sample trip, so you can''t request a seat.';
  end if;
  return new;
end;
$$;

create trigger trip_requests_not_sample
  before insert on public.trip_requests
  for each row execute function public.refuse_sample_trip_requests();
