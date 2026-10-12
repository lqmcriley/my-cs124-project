-- Seat maps: each car has a seat layout, drivers choose which seats to offer on
-- a trip, and riders pick a seat when they request. A waiting request holds its
-- seat; a decline or cancel frees it. Two people can never hold the same seat.
-- Trips posted before this have no seat map and work like before ("a seat").
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.

---------------------------------------------------------------------------
-- 1. Layouts. Same list as src/lib/seats.ts. The driver's seat isn't listed.
---------------------------------------------------------------------------
create or replace function public.layout_seats(p_layout text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_layout
    when '2' then array['front']
    when '4' then array['front', 'back_left', 'back_right']
    when '5' then array['front', 'back_left', 'back_middle', 'back_right']
    when '5_cramped' then array['front', 'back_left', 'back_middle', 'back_right']
    when '7' then array['front', 'middle_left', 'middle_right', 'back_left', 'back_middle', 'back_right']
    when '8' then array['front', 'middle_left', 'middle_middle', 'middle_right', 'back_left', 'back_middle', 'back_right']
  end;
$$;

-- A trip's offered seats: real seats from its layout, no repeats, one per seat offered.
create or replace function public.valid_open_seats(p_layout text, p_open text[], p_seats_offered integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_open <@ public.layout_seats(p_layout)
     and cardinality(p_open) = p_seats_offered
     and cardinality(p_open) = (select count(distinct seat) from unnest(p_open) as seat);
$$;

---------------------------------------------------------------------------
-- 2. Cars get a layout. Passenger seats always match it.
---------------------------------------------------------------------------
alter table public.cars
  add column seat_layout text check (seat_layout in ('2', '4', '5', '5_cramped', '7', '8'));

-- Fills in a layout for cars saved without one, and keeps `seats` in step with the layout.
create or replace function public.cars_fill_seat_layout()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.seat_layout is null then
    new.seat_layout := case
      when new.seats <= 1 then '2'
      when new.seats <= 3 then '4'
      when new.seats = 4 then '5'
      when new.seats <= 6 then '7'
      else '8'
    end;
  end if;
  new.seats := cardinality(public.layout_seats(new.seat_layout));
  return new;
end;
$$;

create trigger cars_fill_seat_layout
  before insert or update on public.cars
  for each row execute function public.cars_fill_seat_layout();

update public.cars set seat_layout = null; -- the trigger picks a layout from each car's seats
alter table public.cars alter column seat_layout set not null;

---------------------------------------------------------------------------
-- 3. Trips remember the layout and which seats the driver offers.
---------------------------------------------------------------------------
alter table public.trips
  add column seat_layout text check (seat_layout in ('2', '4', '5', '5_cramped', '7', '8')),
  add column open_seats text[],
  add constraint trips_open_seats_valid check (
    (seat_layout is null and open_seats is null)
    or (seat_layout is not null and open_seats is not null and public.valid_open_seats(seat_layout, open_seats, seats_offered))
  );

-- Drivers can change which seats they offer (but not the layout).
grant update (open_seats) on public.trips to authenticated;

---------------------------------------------------------------------------
-- 4. Requests hold a seat. One person per seat at a time.
---------------------------------------------------------------------------
alter table public.trip_requests
  add column seat text check (seat in ('front', 'middle_left', 'middle_middle', 'middle_right', 'back_left', 'back_middle', 'back_right'));

create unique index trip_requests_one_per_seat
  on public.trip_requests (trip_id, seat)
  where seat is not null and status in ('pending', 'approved');

-- A driver can't stop offering a seat someone is holding.
create or replace function public.trips_keep_held_seats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seat text;
begin
  if new.open_seats is distinct from old.open_seats and new.open_seats is not null then
    select r.seat into v_seat
    from public.trip_requests r
    where r.trip_id = new.id and r.seat is not null and r.status in ('pending', 'approved')
      and not (r.seat = any (new.open_seats))
    limit 1;
    if v_seat is not null then
      raise exception 'Someone has the % seat. Decline their request first, or keep offering it.', replace(v_seat, '_', ' ');
    end if;
  end if;
  return new;
end;
$$;

create trigger trips_keep_held_seats
  before update of open_seats on public.trips
  for each row execute function public.trips_keep_held_seats();

---------------------------------------------------------------------------
-- 5. request_seat now takes the seat you picked (needed when the trip has a seat map).
---------------------------------------------------------------------------
drop function public.request_seat(uuid, numeric, text, text, double precision, double precision, text, boolean);

create function public.request_seat(
  p_trip_id uuid,
  p_rider_miles numeric default null,
  p_dropoff_name text default null,
  p_dropoff_address text default null,
  p_dropoff_lat double precision default null,
  p_dropoff_lng double precision default null,
  p_message text default null,
  p_parking_acknowledged boolean default false,
  p_seat text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_trip public.trips;
  v_seat text;
  v_id uuid;
  v_constraint text;
begin
  if v_uid is null then
    raise exception 'Please sign in first.';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Finish your profile before requesting a seat.';
  end if;

  -- Lock the trip so two requests at once can't grab the same seat.
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

  -- Seat maps: you must pick an offered seat that nobody else is holding.
  if v_trip.seat_layout is not null then
    v_seat := p_seat;
    if v_seat is null then
      raise exception 'Pick a seat first.';
    end if;
    if not (v_seat = any (v_trip.open_seats)) then
      raise exception 'That seat isn''t offered on this trip. Pick another one.';
    end if;
    if exists (
      select 1 from public.trip_requests
      where trip_id = p_trip_id and seat = v_seat and status in ('pending', 'approved')
    ) then
      raise exception 'Someone just took that seat. Pick another one.';
    end if;
  end if;

  begin
    insert into public.trip_requests (
      trip_id, rider_id, rider_miles, dropoff_name, dropoff_address, dropoff_lat, dropoff_lng, message, parking_acknowledged, seat
    ) values (
      p_trip_id, v_uid, p_rider_miles, p_dropoff_name, p_dropoff_address, p_dropoff_lat, p_dropoff_lng,
      nullif(trim(p_message), ''), coalesce(p_parking_acknowledged, false), v_seat
    )
    returning id into v_id;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'trip_requests_one_per_seat' then
      raise exception 'Someone just took that seat. Pick another one.';
    end if;
    raise exception 'You already requested a seat on this trip.';
  end;

  return v_id;
end;
$$;

revoke execute on function public.request_seat from public, anon;
grant execute on function public.request_seat to authenticated;

---------------------------------------------------------------------------
-- 6. trip_seats: who is in which seat, for the seat map. Anyone signed in can
--    see which seats are held; names and photos show only for approved riders
--    (and, for the driver, for waiting requests too).
---------------------------------------------------------------------------
create or replace function public.trip_seats(p_trip_id uuid)
returns table (seat text, status text, is_me boolean, first_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.seat,
    r.status,
    r.rider_id = auth.uid(),
    case when r.status = 'approved' or r.rider_id = auth.uid() or t.driver_id = auth.uid()
      then split_part(trim(p.full_name), ' ', 1) end,
    case when r.status = 'approved' or r.rider_id = auth.uid() or t.driver_id = auth.uid()
      then p.avatar_url end
  from public.trip_requests r
  join public.trips t on t.id = r.trip_id
  join public.profiles p on p.id = r.rider_id
  where r.trip_id = p_trip_id
    and r.seat is not null
    and r.status in ('pending', 'approved')
    and auth.uid() is not null;
$$;

revoke execute on function public.trip_seats from public, anon;
grant execute on function public.trip_seats to authenticated;

---------------------------------------------------------------------------
-- 7. Sample trips: the seed file (run in the SQL Editor, where nobody is
--    signed in) can seat made-up riders so the demo maps show taken seats.
--    Requests from the app are still refused.
---------------------------------------------------------------------------
create or replace function public.refuse_sample_trip_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and exists (select 1 from public.trips where id = new.trip_id and is_sample) then
    raise exception 'This is a sample trip, so you can''t request a seat.';
  end if;
  return new;
end;
$$;
