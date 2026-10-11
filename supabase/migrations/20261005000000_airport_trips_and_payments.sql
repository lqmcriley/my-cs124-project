-- Airport trip details, editable seats, and private payment handles.
-- Run this in the Supabase dashboard → SQL Editor after the Phase 2 migration.

---------------------------------------------------------------------------
-- 1. Airport details on trips
---------------------------------------------------------------------------
alter table public.trips
  add column is_airport boolean not null default false,
  add column flight_number text check (char_length(flight_number) <= 10),
  add column flight_departs_at timestamptz,
  add column flight_international boolean not null default false,
  -- 'terminal' = drop-off at the terminal; 'offsite' = park somewhere and take a shuttle
  add column parking text not null default 'terminal' check (parking in ('terminal', 'offsite')),
  add column parking_location text check (char_length(parking_location) <= 200),
  add column shuttle_minutes smallint not null default 0 check (shuttle_minutes between 0 and 120);

---------------------------------------------------------------------------
-- 2. Drivers can now change seats (and the airport details) after posting.
--    Seats still can't exceed the car's seats. Route, gas price and MPG stay locked.
---------------------------------------------------------------------------
drop policy "Drivers can update their own trips" on public.trips;

create policy "Drivers can update their own trips"
  on public.trips for update to authenticated
  using (driver_id = (select auth.uid()))
  with check (
    driver_id = (select auth.uid())
    and seats_offered <= coalesce((select cars.seats from public.cars where cars.id = trips.car_id), 7)
  );

grant update (
  seats_offered,
  is_airport, flight_number, flight_departs_at, flight_international,
  parking, parking_location, shuttle_minutes
) on public.trips to authenticated;

---------------------------------------------------------------------------
-- 3. Payment handles (Venmo, Cash App, PayPal). Private: only you can see
--    yours for now. Phase 4 lets riders on your trip see them to pay you.
---------------------------------------------------------------------------
create table public.payment_methods (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  venmo_username text check (venmo_username ~ '^[A-Za-z0-9_-]{5,30}$'),
  cashapp_cashtag text check (cashapp_cashtag ~ '^[A-Za-z0-9]{1,20}$' and cashapp_cashtag ~ '[A-Za-z]'),
  paypal_username text check (paypal_username ~ '^[A-Za-z0-9]{1,20}$'),
  updated_at timestamptz not null default now()
);

create trigger payment_methods_set_updated_at
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

alter table public.payment_methods enable row level security;

create policy "Users can view their own payment handles"
  on public.payment_methods for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can add their own payment handles"
  on public.payment_methods for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own payment handles"
  on public.payment_methods for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can remove their own payment handles"
  on public.payment_methods for delete to authenticated
  using (user_id = (select auth.uid()));
