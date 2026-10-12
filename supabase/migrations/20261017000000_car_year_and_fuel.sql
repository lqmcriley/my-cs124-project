-- Car model year and fuel type (regular, premium, diesel, hybrid, electric).
-- Electric cars store miles per kWh in `mpg`, and their trips store the
-- charging price per kWh in `gas_price`, so the price math stays the same.
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.

---------------------------------------------------------------------------
-- 1. Cars: model year + fuel. Efficiency limits depend on the fuel.
---------------------------------------------------------------------------
alter table public.cars
  add column model_year smallint check (model_year between 1980 and 2100),
  add column fuel text not null default 'regular' check (fuel in ('regular', 'premium', 'diesel', 'hybrid', 'electric'));

alter table public.cars drop constraint cars_mpg_check;
alter table public.cars add constraint cars_efficiency_check check (
  (fuel = 'electric' and mpg between 1 and 10)       -- miles per kWh
  or (fuel <> 'electric' and mpg between 5 and 150)  -- miles per gallon
);

---------------------------------------------------------------------------
-- 2. Trips remember the car's fuel when posted. Price limits depend on it.
---------------------------------------------------------------------------
alter table public.trips
  add column fuel text not null default 'regular' check (fuel in ('regular', 'premium', 'diesel', 'hybrid', 'electric'));

alter table public.trips drop constraint trips_mpg_check;
alter table public.trips drop constraint trips_gas_price_check;
alter table public.trips add constraint trips_energy_check check (
  (fuel = 'electric' and mpg between 1 and 10 and gas_price between 0.05 and 1)    -- mi/kWh, $/kWh
  or (fuel <> 'electric' and mpg between 5 and 150 and gas_price between 1 and 10) -- MPG, $/gallon
);

-- A trip's fuel always comes from the driver's car (the app can't pick it).
create or replace function public.trips_copy_car_fuel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.fuel := coalesce((select fuel from public.cars where id = new.car_id), 'regular');
  return new;
end;
$$;

create trigger trips_copy_car_fuel
  before insert on public.trips
  for each row execute function public.trips_copy_car_fuel();

---------------------------------------------------------------------------
-- 3. Changing your car's MPG or fuel updates your upcoming, unbooked trips,
--    as long as they stay the same kind (gas stays gas, electric stays electric).
---------------------------------------------------------------------------
create or replace function public.sync_trip_mpg()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.mpg is distinct from old.mpg or new.fuel is distinct from old.fuel then
    update public.trips
    set mpg = new.mpg, fuel = new.fuel
    where car_id = new.id
      and status = 'scheduled'
      and departure_at > now()
      and seats_booked = 0
      and late_cancel_count = 0
      and (fuel = 'electric') = (new.fuel = 'electric');
  end if;
  return new;
end;
$$;

drop trigger cars_sync_trip_mpg on public.cars;
create trigger cars_sync_trip_mpg
  after update of mpg, fuel on public.cars
  for each row execute function public.sync_trip_mpg();
