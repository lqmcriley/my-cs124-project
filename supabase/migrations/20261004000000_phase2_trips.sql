-- Phase 2: trips.
-- Run this in the Supabase dashboard → SQL Editor after the Phase 1 migration.

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  car_id uuid references public.cars (id) on delete set null, -- kept if the driver later removes their car

  -- Where from / to (the "from" place is the pickup spot)
  origin_name text not null check (char_length(origin_name) between 1 and 200),
  origin_address text not null check (char_length(origin_address) <= 300),
  origin_lat double precision not null check (origin_lat between -90 and 90),
  origin_lng double precision not null check (origin_lng between -180 and 180),
  dest_name text not null check (char_length(dest_name) between 1 and 200),
  dest_address text not null check (char_length(dest_address) <= 300),
  dest_lat double precision not null check (dest_lat between -90 and 90),
  dest_lng double precision not null check (dest_lng between -180 and 180),

  -- The driving route from Google. Prices are based on route_miles.
  route_miles numeric(6, 1) not null check (route_miles > 0 and route_miles <= 1500),
  route_minutes integer check (route_minutes > 0),
  route_polyline text,

  departure_at timestamptz not null,
  flex_minutes smallint not null default 30 check (flex_minutes in (30, 60, 120)),
  seats_offered smallint not null check (seats_offered between 1 and 7),
  pickup_spot text not null check (char_length(pickup_spot) between 1 and 200),
  luggage text not null default 'backpack' check (luggage in ('none', 'backpack', 'carry_on', 'large')),
  notes text check (char_length(notes) <= 500),

  -- Pricing inputs, frozen when the trip is posted.
  gas_price numeric(4, 2) not null check (gas_price between 1 and 10),
  mpg numeric(5, 1) not null check (mpg between 5 and 150),

  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trips_departure_idx on public.trips (departure_at) where status = 'scheduled';
create index trips_driver_idx on public.trips (driver_id);

create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

alter table public.trips enable row level security;

-- Any signed-in student can browse trips.
create policy "Signed-in users can view trips"
  on public.trips for select to authenticated
  using (true);

-- Drivers post trips only as themselves, with their own car, its real MPG,
-- no more seats than the car has, and a departure in the future.
-- (Checking MPG here stops a driver from claiming worse MPG to raise the price.)
create policy "Drivers can post trips with their own car"
  on public.trips for insert to authenticated
  with check (
    driver_id = (select auth.uid())
    and departure_at > now()
    and exists (
      select 1 from public.cars
      where cars.id = trips.car_id
        and cars.owner_id = (select auth.uid())
        and cars.mpg = trips.mpg
        and cars.seats >= trips.seats_offered
    )
  );

-- Drivers can update their own trips…
create policy "Drivers can update their own trips"
  on public.trips for update to authenticated
  using (driver_id = (select auth.uid()))
  with check (driver_id = (select auth.uid()));

-- …but only these columns. Route, seats, gas price and MPG are locked after
-- posting, so the price riders saw can't be changed later.
revoke update on public.trips from authenticated, anon;
grant update (status, departure_at, flex_minutes, luggage, notes) on public.trips to authenticated;

-- No delete policy: trips are cancelled (status = 'cancelled'), never deleted.
