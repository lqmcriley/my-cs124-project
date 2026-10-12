-- A practice ride: one made-up trip anyone can join to see how booking works.
-- Requests on it are approved instantly (nobody is really driving). It's added
-- by supabase/seed/sample_trips.sql and removed by remove_sample_trips.sql.
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.

alter table public.trips
  add column is_practice boolean not null default false;

-- Only the SQL Editor (where nobody is signed in) can make sample or practice trips.
create or replace function public.trips_never_sample_from_app()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.is_sample := false;
    new.is_practice := false;
  end if;
  return new;
end;
$$;

-- Requests on a practice trip are approved right away.
create or replace function public.approve_practice_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending' and exists (select 1 from public.trips where id = new.trip_id and is_practice) then
    update public.trip_requests set status = 'approved', decided_at = now() where id = new.id;
    update public.trips set seats_booked = seats_booked + 1 where id = new.trip_id;
  end if;
  return null;
end;
$$;

create trigger trip_requests_approve_practice
  after insert on public.trip_requests
  for each row execute function public.approve_practice_requests();
