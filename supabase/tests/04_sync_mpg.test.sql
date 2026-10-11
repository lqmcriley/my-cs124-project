-- Changing your car's MPG updates trips nobody has booked yet.
-- Run with: npm run test:db

insert into auth.users (id, email) values
  ('44444444-0000-0000-0000-000000000001', 'alma4@illinois.edu'),
  ('44444444-0000-0000-0000-000000000002', 'red4@illinois.edu');
insert into public.profiles (id, full_name) values
  ('44444444-0000-0000-0000-000000000001', 'Alma Mater'),
  ('44444444-0000-0000-0000-000000000002', 'Red Grange');
insert into public.cars (id, owner_id, make, model, color, plate, mpg, seats)
values ('44444444-0000-0000-0000-0000000000c1', '44444444-0000-0000-0000-000000000001', 'Honda', 'Civic', 'Silver', 'ABC', 30, 3);
insert into public.trips (id, driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg) values
  ('44444444-0000-0000-0000-0000000000e1', '44444444-0000-0000-0000-000000000001', '44444444-0000-0000-0000-0000000000c1',
   'Union', 'x', 40.1, -88.2, 'OHare', 'y', 41.9, -87.9, 150, now() + interval '2 days', 3, 'Union', 3.49, 30),
  ('44444444-0000-0000-0000-0000000000e2', '44444444-0000-0000-0000-000000000001', '44444444-0000-0000-0000-0000000000c1',
   'Union', 'x', 40.1, -88.2, 'Indy', 'y', 39.8, -86.2, 120, now() + interval '3 days', 3, 'Union', 3.49, 30);

set role authenticated;
-- Red books the Indy trip.
select test.as('44444444-0000-0000-0000-000000000002');
select test.ok(public.request_seat('44444444-0000-0000-0000-0000000000e2') is not null, 'setup: Red requests the Indy trip');
select test.as('44444444-0000-0000-0000-000000000001');
select test.ok((select count(*) = 1 from (select public.respond_to_request(id, true) from public.trip_requests) approved), 'setup: Alma approves Red');

-- Alma updates her car's MPG the way the app does (an upsert).
insert into public.cars (owner_id, make, model, color, plate, mpg, seats)
values ('44444444-0000-0000-0000-000000000001', 'Honda', 'Civic', 'Silver', 'ABC', 36, 3)
on conflict (owner_id) do update set mpg = excluded.mpg;

select test.ok((select mpg = 36 from public.trips where id = '44444444-0000-0000-0000-0000000000e1'), 'trip with no riders picks up the new MPG');
select test.ok((select mpg = 30 from public.trips where id = '44444444-0000-0000-0000-0000000000e2'), 'trip with a booked rider keeps the MPG they booked with');
select test.fails($$update public.trips set mpg = 10$$, 'drivers still cannot set a trip''s MPG directly');
reset role;
