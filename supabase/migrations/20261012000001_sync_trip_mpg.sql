-- When a driver changes their car's MPG, update their upcoming trips too,
-- but only trips nobody has booked yet. Once a rider is approved (or late-cancelled),
-- the trip keeps the MPG they booked with, so their price can't shift under them.
-- Run this in the Supabase dashboard → SQL Editor after the reliability migration.

create or replace function public.sync_trip_mpg()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.mpg is distinct from old.mpg then
    update public.trips
    set mpg = new.mpg
    where car_id = new.id
      and status = 'scheduled'
      and departure_at > now()
      and seats_booked = 0
      and late_cancel_count = 0;
  end if;
  return new;
end;
$$;

create trigger cars_sync_trip_mpg
  after update of mpg on public.cars
  for each row execute function public.sync_trip_mpg();
