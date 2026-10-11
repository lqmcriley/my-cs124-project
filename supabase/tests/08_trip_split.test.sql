-- Sharing ride distances for the fair gas split.
-- Run with: npm run test:db

insert into auth.users (id, email) values
  ('88888888-0000-0000-0000-000000000001', 'alma8@illinois.edu'),
  ('88888888-0000-0000-0000-000000000002', 'ana8@illinois.edu'),
  ('88888888-0000-0000-0000-000000000003', 'ben8@illinois.edu'),
  ('88888888-0000-0000-0000-000000000004', 'oscar8@illinois.edu');
insert into public.profiles (id, full_name) values
  ('88888888-0000-0000-0000-000000000001', 'Alma Mater'),
  ('88888888-0000-0000-0000-000000000002', 'Ana Early'),
  ('88888888-0000-0000-0000-000000000003', 'Ben Wholeway'),
  ('88888888-0000-0000-0000-000000000004', 'Oscar Out');
insert into public.cars (id, owner_id, make, model, color, plate, mpg, seats)
values ('88888888-0000-0000-0000-0000000000c1', '88888888-0000-0000-0000-000000000001', 'Honda', 'Civic', 'Silver', 'ABC', 30, 3);
insert into public.trips (id, driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg)
values ('88888888-0000-0000-0000-0000000000e1', '88888888-0000-0000-0000-000000000001', '88888888-0000-0000-0000-0000000000c1',
  'Union', 'x', 40.1, -88.2, 'Far', 'y', 41.9, -80.9, 300, now() + interval '2 days', 3, 'Union', 3, 30);

set role authenticated;
select test.as('88888888-0000-0000-0000-000000000002');
select test.ok(public.request_seat('88888888-0000-0000-0000-0000000000e1', 100) is not null, 'setup: Ana requests to get off at mile 100');
select test.as('88888888-0000-0000-0000-000000000003');
select test.ok(public.request_seat('88888888-0000-0000-0000-0000000000e1') is not null, 'setup: Ben requests the whole way');
select test.as('88888888-0000-0000-0000-000000000001');
select test.ok((select count(*) = 2 from (select public.respond_to_request(id, true) from public.trip_requests) approved), 'setup: Alma approves both');

select test.as('88888888-0000-0000-0000-000000000003'); -- Ben
select test.ok((select count(*) = 2 from public.trip_split('88888888-0000-0000-0000-0000000000e1')), 'a rider sees every paying rider''s distance');
select test.ok((select rider_miles = 100 from public.trip_split('88888888-0000-0000-0000-0000000000e1') where not is_me), 'including where the others get off');
select test.ok((select rider_miles is null from public.trip_split('88888888-0000-0000-0000-0000000000e1') where is_me), 'and knows which one is them');
select test.as('88888888-0000-0000-0000-000000000004'); -- Oscar
select test.ok((select count(*) = 0 from public.trip_split('88888888-0000-0000-0000-0000000000e1')), 'outsiders see nothing');
reset role;
