-- Phases 1–3: sign-up, profiles, cars, trips and booking rules.
-- Run with: npm run test:db

-- Setup (as the database owner) ---------------------------------------------
insert into auth.users (id, email) values
  ('11111111-0000-0000-0000-000000000001', 'alma@illinois.edu'),
  ('11111111-0000-0000-0000-000000000002', 'red@illinois.edu'),
  ('11111111-0000-0000-0000-000000000003', 'chief@illinois.edu');
insert into public.profiles (id, full_name) values
  ('11111111-0000-0000-0000-000000000001', 'Alma Mater'),
  ('11111111-0000-0000-0000-000000000002', 'Red Grange'),
  ('11111111-0000-0000-0000-000000000003', 'Chief Ill');
insert into public.cars (id, owner_id, make, model, color, plate, mpg, seats)
values ('11111111-0000-0000-0000-0000000000c1', '11111111-0000-0000-0000-000000000001', 'Honda', 'Civic', 'Silver', 'ABC', 32, 2);

-- Sign-up -------------------------------------------------------------------
select test.fails($$insert into auth.users (email) values ('x@gmail.com')$$, 'non-Illinois email is rejected');
select test.fails($$insert into auth.users (email) values ('x@notillinois.edu')$$, 'look-alike domain is rejected');

set role authenticated;

-- Profiles and cars ----------------------------------------------------------
select test.as('11111111-0000-0000-0000-000000000002'); -- Red
select test.fails($$insert into public.profiles (id, full_name) values (gen_random_uuid(), 'Fake')$$, 'cannot create a profile for someone else');
update public.profiles set full_name = 'Hacked' where id = '11111111-0000-0000-0000-000000000001';
update public.cars set mpg = 5;
reset role;
select test.ok((select full_name from public.profiles where id = '11111111-0000-0000-0000-000000000001') = 'Alma Mater', 'cannot edit someone else''s profile');
select test.ok((select mpg from public.cars where id = '11111111-0000-0000-0000-0000000000c1') = 32, 'cannot edit someone else''s car');
set role authenticated;

-- Trips ---------------------------------------------------------------------
select test.as('11111111-0000-0000-0000-000000000001'); -- Alma, driver
select test.ok(true, 'acting as the driver');
insert into public.trips (id, driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg)
values ('11111111-0000-0000-0000-0000000000f1', '11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-0000000000c1',
  'Union', 'x', 40.1, -88.2, 'OHare', 'y', 41.9, -87.9, 150, now() + interval '1 day', 1, 'Union', 3.49, 32);
select test.fails($$insert into public.trips (driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg)
  values ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-0000000000c1', 'A', 'x', 40, -88, 'B', 'y', 41, -87, 150, now() + interval '1 day', 1, 'A', 3.49, 10)$$,
  'cannot post with a fake low MPG');
select test.fails($$update public.trips set gas_price = 9.99$$, 'gas price is locked after posting');
select test.fails($$update public.trips set seats_offered = 3$$, 'cannot offer more seats than the car has');

-- Booking -------------------------------------------------------------------
select test.fails($$select public.request_seat('11111111-0000-0000-0000-0000000000f1')$$, 'driver cannot request own trip');

select test.as('11111111-0000-0000-0000-000000000002'); -- Red
select test.ok(public.request_seat('11111111-0000-0000-0000-0000000000f1') is not null, 'rider can request a seat');
select test.fails($$select public.request_seat('11111111-0000-0000-0000-0000000000f1')$$, 'cannot request the same trip twice');
select test.fails($$insert into public.trip_requests (trip_id, rider_id, status) values ('11111111-0000-0000-0000-0000000000f1', '11111111-0000-0000-0000-000000000002', 'approved')$$, 'cannot skip the request function');
select test.fails($$select public.respond_to_request((select id from public.trip_requests where rider_id = '11111111-0000-0000-0000-000000000002'), true)$$, 'rider cannot approve themselves');

select test.as('11111111-0000-0000-0000-000000000003'); -- Chief
select test.ok(public.request_seat('11111111-0000-0000-0000-0000000000f1') is not null, 'second rider can request');
select test.ok((select count(*) from public.trip_requests) = 1, 'riders only see their own requests');

select test.as('11111111-0000-0000-0000-000000000001'); -- Alma
select test.ok((select count(*) from public.trip_requests) = 2, 'driver sees all requests for the trip');
select public.respond_to_request((select id from public.trip_requests where rider_id = '11111111-0000-0000-0000-000000000002'), true);
select test.ok((select seats_booked from public.trips where id = '11111111-0000-0000-0000-0000000000f1') = 1, 'approving fills a seat');
select test.fails($$select public.respond_to_request((select id from public.trip_requests where rider_id = '11111111-0000-0000-0000-000000000003'), true)$$, 'cannot approve past the seat limit');
select test.fails($$update public.trips set seats_booked = 0$$, 'driver cannot change seats_booked directly');

select test.as('11111111-0000-0000-0000-000000000003'); -- Chief
select test.ok((select count(*) from public.trip_riders('11111111-0000-0000-0000-0000000000f1')) = 1, 'anyone signed in sees booked riders');
select test.fails($$select public.cancel_request((select r.id from public.trip_requests r where r.rider_id = '11111111-0000-0000-0000-000000000002'))$$, 'cannot cancel someone else''s request');

select test.as('11111111-0000-0000-0000-000000000002'); -- Red leaves
select public.cancel_request((select id from public.trip_requests where rider_id = '11111111-0000-0000-0000-000000000002'));
select test.ok((select seats_booked from public.trips where id = '11111111-0000-0000-0000-0000000000f1') = 0, 'leaving frees the seat');

reset role;
set role anon;
select test.fails($$select public.request_seat('11111111-0000-0000-0000-0000000000f1')$$, 'signed-out users cannot request seats');
reset role;
