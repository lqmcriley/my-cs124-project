-- Phase 3: booking. Seat requests, approve/decline, cancellations.
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.
--
-- Requests are created and changed ONLY through the functions below
-- (request_seat, respond_to_request, cancel_request). Each one checks who is
-- calling and whether the change is allowed, so a modified app can't skip the rules.

---------------------------------------------------------------------------
-- 1. Count booked seats on each trip (kept up to date by the functions below).
---------------------------------------------------------------------------
alter table public.trips
  add column seats_booked smallint not null default 0 check (seats_booked >= 0),
  add constraint trips_seats_booked_le_offered check (seats_booked <= seats_offered);
-- Drivers still can't write seats_booked directly: it isn't in the update grant.

---------------------------------------------------------------------------
-- 2. Seat requests
---------------------------------------------------------------------------
create table public.trip_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  rider_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),

  -- Getting off early? Then the rider pays only for these miles. Null = whole trip.
  rider_miles numeric(6, 1) check (rider_miles > 0),
  dropoff_name text check (char_length(dropoff_name) <= 200),
  dropoff_address text check (char_length(dropoff_address) <= 300),
  dropoff_lat double precision check (dropoff_lat between -90 and 90),
  dropoff_lng double precision check (dropoff_lng between -180 and 180),

  message text check (char_length(message) <= 300), -- note to the driver
  parking_acknowledged boolean not null default false,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A rider can have only one open (pending or approved) request per trip.
create unique index trip_requests_one_open_per_rider
  on public.trip_requests (trip_id, rider_id)
  where status in ('pending', 'approved');
create index trip_requests_rider_idx on public.trip_requests (rider_id);
create index trip_requests_trip_idx on public.trip_requests (trip_id);

create trigger trip_requests_set_updated_at
  before update on public.trip_requests
  for each row execute function public.set_updated_at();

alter table public.trip_requests enable row level security;

-- Riders see their own requests; drivers see requests for their trips.
create policy "Riders and drivers can view their requests"
  on public.trip_requests for select to authenticated
  using (
    rider_id = (select auth.uid())
    or exists (select 1 from public.trips where trips.id = trip_requests.trip_id and trips.driver_id = (select auth.uid()))
  );
-- No insert/update/delete policies: changes go through the functions below.

---------------------------------------------------------------------------
-- 3. request_seat: a rider asks to join a trip.
---------------------------------------------------------------------------
create or replace function public.request_seat(
  p_trip_id uuid,
  p_rider_miles numeric default null,
  p_dropoff_name text default null,
  p_dropoff_address text default null,
  p_dropoff_lat double precision default null,
  p_dropoff_lng double precision default null,
  p_message text default null,
  p_parking_acknowledged boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_trip public.trips;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Please sign in first.';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Finish your profile before requesting a seat.';
  end if;

  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'Trip not found.';
  end if;
  if v_trip.driver_id = v_uid then
    raise exception 'You can''t request a seat on your own trip.';
  end if;
  if v_trip.status <> 'scheduled' or v_trip.departure_at <= now() then
    raise exception 'This trip is no longer taking requests.';
  end if;
  if v_trip.seats_booked >= v_trip.seats_offered then
    raise exception 'This trip is full.';
  end if;
  if exists (
    select 1 from public.trip_requests
    where trip_id = p_trip_id and rider_id = v_uid and status in ('pending', 'approved')
  ) then
    raise exception 'You already requested a seat on this trip.';
  end if;
  if p_rider_miles is not null and (p_rider_miles <= 0 or p_rider_miles > v_trip.route_miles + 1) then
    raise exception 'Your drop-off needs to be along the way.';
  end if;
  if v_trip.parking = 'offsite' and not coalesce(p_parking_acknowledged, false) then
    raise exception 'Please confirm the parking and shuttle plan first.';
  end if;

  insert into public.trip_requests (
    trip_id, rider_id, rider_miles, dropoff_name, dropoff_address, dropoff_lat, dropoff_lng, message, parking_acknowledged
  ) values (
    p_trip_id, v_uid, p_rider_miles, p_dropoff_name, p_dropoff_address, p_dropoff_lat, p_dropoff_lng,
    nullif(trim(p_message), ''), coalesce(p_parking_acknowledged, false)
  )
  returning id into v_id;

  return v_id;
end;
$$;

---------------------------------------------------------------------------
-- 4. respond_to_request: the driver approves or declines.
---------------------------------------------------------------------------
create or replace function public.respond_to_request(p_request_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.trip_requests;
  v_trip public.trips;
begin
  select * into v_request from public.trip_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found.';
  end if;

  -- Lock the trip so two approvals at once can't overfill the car.
  select * into v_trip from public.trips where id = v_request.trip_id for update;
  if v_trip.driver_id is distinct from v_uid then
    raise exception 'Only the driver can answer requests.';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This request was already answered or cancelled.';
  end if;

  if p_approve then
    if v_trip.status <> 'scheduled' then
      raise exception 'This trip is no longer scheduled.';
    end if;
    if v_trip.seats_booked >= v_trip.seats_offered then
      raise exception 'Your car is full. Add a seat or decline this request.';
    end if;
    update public.trip_requests set status = 'approved', decided_at = now() where id = p_request_id;
    update public.trips set seats_booked = seats_booked + 1 where id = v_trip.id;
  else
    update public.trip_requests set status = 'declined', decided_at = now() where id = p_request_id;
  end if;
end;
$$;

---------------------------------------------------------------------------
-- 5. cancel_request: the rider withdraws (pending) or drops out (approved).
---------------------------------------------------------------------------
create or replace function public.cancel_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.trip_requests;
begin
  select * into v_request from public.trip_requests where id = p_request_id for update;
  if not found or v_request.rider_id is distinct from v_uid then
    raise exception 'Request not found.';
  end if;
  if v_request.status not in ('pending', 'approved') then
    raise exception 'This request is already closed.';
  end if;

  update public.trip_requests set status = 'cancelled', decided_at = now() where id = p_request_id;
  if v_request.status = 'approved' then
    update public.trips set seats_booked = greatest(seats_booked - 1, 0) where id = v_request.trip_id;
  end if;
end;
$$;

---------------------------------------------------------------------------
-- 6. trip_riders: first name + photo of approved riders, for any signed-in student.
--    (Requests themselves stay private between rider and driver.)
---------------------------------------------------------------------------
create or replace function public.trip_riders(p_trip_id uuid)
returns table (rider_id uuid, first_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, split_part(trim(p.full_name), ' ', 1), p.avatar_url
  from public.trip_requests r
  join public.profiles p on p.id = r.rider_id
  where r.trip_id = p_trip_id
    and r.status = 'approved'
    and auth.uid() is not null
  order by r.decided_at;
$$;

-- Only signed-in users can call these.
revoke execute on function public.request_seat, public.respond_to_request, public.cancel_request, public.trip_riders from public, anon;
grant execute on function public.request_seat, public.respond_to_request, public.cancel_request, public.trip_riders to authenticated;
