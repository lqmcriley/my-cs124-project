-- Long trip plans.
-- Run with: npm run test:db

insert into auth.users (id, email) values ('99999999-0000-0000-0000-000000000001', 'alma9@illinois.edu');
insert into public.profiles (id, full_name) values ('99999999-0000-0000-0000-000000000001', 'Alma Mater');
insert into public.cars (id, owner_id, make, model, color, plate, mpg, seats)
values ('99999999-0000-0000-0000-0000000000c1', '99999999-0000-0000-0000-000000000001', 'Honda', 'Civic', 'Silver', 'ABC', 32, 3);

set role authenticated;
select test.as('99999999-0000-0000-0000-000000000001');
insert into public.trips (id, driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, route_minutes, departure_at, seats_offered, pickup_spot, gas_price, mpg, long_trip_plan, overnight_stop)
values ('99999999-0000-0000-0000-0000000000e1', '99999999-0000-0000-0000-000000000001', '99999999-0000-0000-0000-0000000000c1',
  'Union', 'x', 40.1, -88.2, 'Hartford', 'y', 41.77, -72.67, 965, 900, now() + interval '30 days', 3, 'Union', 3.49, 32, 'overnight', 'Youngstown, OH');
select test.ok((select long_trip_plan = 'overnight' and overnight_stop = 'Youngstown, OH' from public.trips where id = '99999999-0000-0000-0000-0000000000e1'), 'a driver can post an overnight plan');
update public.trips set long_trip_plan = 'straight', overnight_stop = null where id = '99999999-0000-0000-0000-0000000000e1';
select test.ok((select long_trip_plan = 'straight' from public.trips where id = '99999999-0000-0000-0000-0000000000e1'), 'the driver can change the plan later');
select test.fails($$update public.trips set long_trip_plan = 'teleport'$$, 'only known plans are allowed');
reset role;
