-- Drivers moving a booked trip a lot: riders are told and can drop out for free.
-- Run with: npm run test:db

insert into auth.users (id, email) values
  ('dddddddd-0000-0000-0000-000000000001', 'alma13@illinois.edu'),
  ('dddddddd-0000-0000-0000-000000000002', 'red13@illinois.edu'),
  ('dddddddd-0000-0000-0000-000000000003', 'bea13@illinois.edu');
insert into public.profiles (id, full_name) values
  ('dddddddd-0000-0000-0000-000000000001', 'Alma Mater'),
  ('dddddddd-0000-0000-0000-000000000002', 'Red Grange'),
  ('dddddddd-0000-0000-0000-000000000003', 'Bea Rider');
insert into public.cars (id, owner_id, make, model, color, plate, mpg, seats)
values ('dddddddd-0000-0000-0000-0000000000c1', 'dddddddd-0000-0000-0000-000000000001', 'Honda', 'Civic', 'Silver', 'ABC', 32, 3);

set role authenticated;
select test.as('dddddddd-0000-0000-0000-000000000001');
-- O'Hare back to campus, leaving in 10 hours, 30 minute wait window.
insert into public.trips (id, driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, flex_minutes, seats_offered, pickup_spot, gas_price, mpg)
values ('dddddddd-0000-0000-0000-0000000000e1', 'dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-0000000000c1',
  'OHare', 'x', 41.98, -87.9, 'Union', 'y', 40.1, -88.2, 150, now() + interval '10 hours', 30, 2, 'OHare', 3.49, 32);

select test.as('dddddddd-0000-0000-0000-000000000002');
select public.request_seat('dddddddd-0000-0000-0000-0000000000e1');
select test.as('dddddddd-0000-0000-0000-000000000003');
select public.request_seat('dddddddd-0000-0000-0000-0000000000e1');
select test.as('dddddddd-0000-0000-0000-000000000001');
select public.respond_to_request(id, true) from public.trip_requests where trip_id = 'dddddddd-0000-0000-0000-0000000000e1';

-- A small change (inside the 30 minute window) is not a big move.
update public.trips set departure_at = departure_at + interval '20 minutes' where id = 'dddddddd-0000-0000-0000-0000000000e1';
select test.ok((select departure_moved_at is null from public.trips where id = 'dddddddd-0000-0000-0000-0000000000e1'), 'small changes inside the wait window are not flagged');

-- Without a big move, dropping out under 24 hours is a late cancel.
select test.as('dddddddd-0000-0000-0000-000000000003');
select public.cancel_request((select id from public.trip_requests where rider_id = 'dddddddd-0000-0000-0000-000000000003'));
select test.ok((select late_cancel from public.trip_requests where rider_id = 'dddddddd-0000-0000-0000-000000000003'), 'normally, dropping out within 24 hours is a late cancel');

-- The driver's flight is late: they move the trip 3 hours.
select test.as('dddddddd-0000-0000-0000-000000000001');
update public.trips set departure_at = departure_at + interval '3 hours' where id = 'dddddddd-0000-0000-0000-0000000000e1';
select test.ok((select departure_moved_at is not null and previous_departure_at < departure_at from public.trips where id = 'dddddddd-0000-0000-0000-0000000000e1'), 'a big move is recorded with the old time');
select test.fails($$update public.trips set departure_moved_at = null where id = 'dddddddd-0000-0000-0000-0000000000e1'$$, 'drivers cannot erase the record of a big move');

select test.as('dddddddd-0000-0000-0000-000000000002');
select public.cancel_request((select id from public.trip_requests where rider_id = 'dddddddd-0000-0000-0000-000000000002'));
select test.ok((select not late_cancel from public.trip_requests where rider_id = 'dddddddd-0000-0000-0000-000000000002'), 'after a big move, riders can drop out for free');
select test.ok((select late_cancel_count = 1 from public.trips where id = 'dddddddd-0000-0000-0000-0000000000e1'), 'only the earlier late cancel counts');
reset role;
