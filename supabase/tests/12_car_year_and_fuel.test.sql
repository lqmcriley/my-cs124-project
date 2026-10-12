-- Car model year and fuel types, including electric cars (mi/kWh and $/kWh).
-- Run with: npm run test:db

insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'gas12@illinois.edu'),
  ('cccccccc-0000-0000-0000-000000000002', 'ev12@illinois.edu');
insert into public.profiles (id, full_name) values
  ('cccccccc-0000-0000-0000-000000000001', 'Gus Gas'),
  ('cccccccc-0000-0000-0000-000000000002', 'Eve Volt');

set role authenticated;

-- Gas car --------------------------------------------------------------------
select test.as('cccccccc-0000-0000-0000-000000000001');
insert into public.cars (id, owner_id, make, model, color, plate, mpg, seats, model_year, fuel)
values ('cccccccc-0000-0000-0000-0000000000c1', 'cccccccc-0000-0000-0000-000000000001', 'BMW', '330i', 'Black', 'GAS1', 30, 4, 2019, 'premium');
select test.ok((select model_year = 2019 and fuel = 'premium' from public.cars where id = 'cccccccc-0000-0000-0000-0000000000c1'), 'a driver can save the year and premium fuel');
select test.fails($$update public.cars set mpg = 3.5 where id = 'cccccccc-0000-0000-0000-0000000000c1'$$, 'gas cars still need a real MPG');
select test.fails($$update public.cars set fuel = 'rocket' where id = 'cccccccc-0000-0000-0000-0000000000c1'$$, 'only known fuels are allowed');
select test.fails($$update public.cars set model_year = 1950 where id = 'cccccccc-0000-0000-0000-0000000000c1'$$, 'very old model years are rejected');
insert into public.trips (id, driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg, fuel)
values ('cccccccc-0000-0000-0000-0000000000e1', 'cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-0000000000c1',
  'Union', 'x', 40.1, -88.2, 'Indy', 'y', 39.8, -86.2, 120, now() + interval '3 days', 2, 'Union', 3.99, 30, 'electric');
select test.ok((select fuel = 'premium' from public.trips where id = 'cccccccc-0000-0000-0000-0000000000e1'), 'a trip takes its fuel from the car, not the app');

-- Electric car -----------------------------------------------------------------
select test.as('cccccccc-0000-0000-0000-000000000002');
insert into public.cars (id, owner_id, make, model, color, plate, mpg, seats, model_year, fuel)
values ('cccccccc-0000-0000-0000-0000000000c2', 'cccccccc-0000-0000-0000-000000000002', 'Tesla', 'Model 3', 'White', 'EV1', 4.0, 4, 2022, 'electric');
select test.ok(true, 'an electric car saves miles per kWh');
insert into public.trips (id, driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg)
values ('cccccccc-0000-0000-0000-0000000000e2', 'cccccccc-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-0000000000c2',
  'Union', 'x', 40.1, -88.2, 'Chicago', 'y', 41.9, -87.6, 140, now() + interval '3 days', 3, 'Union', 0.20, 4.0);
select test.ok((select fuel = 'electric' and gas_price = 0.20 from public.trips where id = 'cccccccc-0000-0000-0000-0000000000e2'), 'an electric trip uses a charging price per kWh');
select test.fails($$insert into public.trips (driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg)
  values ('cccccccc-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-0000000000c2', 'Union', 'x', 40.1, -88.2, 'Chicago', 'y', 41.9, -87.6, 140, now() + interval '3 days', 3, 'Union', 3.49, 4.0)$$,
  'an electric trip cannot use a gas price');

-- Changing the car updates unbooked trips of the same kind only.
update public.cars set mpg = 3.6 where id = 'cccccccc-0000-0000-0000-0000000000c2';
select test.ok((select mpg = 3.6 from public.trips where id = 'cccccccc-0000-0000-0000-0000000000e2'), 'a new mi/kWh updates the electric trip');
select test.as('cccccccc-0000-0000-0000-000000000001');
update public.cars set fuel = 'regular' where id = 'cccccccc-0000-0000-0000-0000000000c1';
select test.ok((select fuel = 'regular' from public.trips where id = 'cccccccc-0000-0000-0000-0000000000e1'), 'switching premium to regular updates the unbooked trip');
update public.cars set fuel = 'electric', mpg = 4 where id = 'cccccccc-0000-0000-0000-0000000000c1';
select test.ok((select fuel = 'regular' and mpg = 30 from public.trips where id = 'cccccccc-0000-0000-0000-0000000000e1'), 'switching a gas car to electric leaves gas trips alone');
reset role;
