-- Long trips (8+ hours of driving): is the driver going straight through or
-- stopping overnight, and roughly where. Everyone books their own room.
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.

alter table public.trips
  add column long_trip_plan text check (long_trip_plan in ('straight', 'overnight')), -- null for normal trips
  add column overnight_stop text check (char_length(overnight_stop) <= 100);          -- e.g. "Youngstown, OH"

-- Drivers can change the plan after posting.
grant update (long_trip_plan, overnight_stop) on public.trips to authenticated;
