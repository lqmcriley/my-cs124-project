-- Sample trips: the seed file works, they can't be requested, and they can be removed.
-- Run with: npm run test:db

-- Run the seed like the SQL Editor does (nobody signed in). Twice, to check it refreshes cleanly.
select set_config('request.jwt.claim.sub', '', false);
\ir ../seed/sample_trips.sql
\ir ../seed/sample_trips.sql
select test.ok((select count(*) = 15 from public.trips where is_sample), 'the seed adds 15 sample trips (and re-running it does not duplicate them)');
select test.ok((select bool_and(departure_at > now() and status = 'scheduled') from public.trips where is_sample), 'every sample trip is upcoming');
select test.ok((select count(*) = 11 and bool_and(banned_until = 'infinity') from auth.users where email like 'hitchillini.sample%'), 'sample drivers can never sign in');
select test.ok((select count(*) = 1 from public.trips where is_practice and not is_sample), 'there is one practice ride');
select test.ok((select long_trip_plan = 'overnight' and route_minutes >= 480 from public.trips where is_sample and dest_name = 'Hartford'), 'the Hartford sample shows off an overnight long trip');
select test.ok((select count(*) = 2 from public.trips where is_sample and is_airport), 'two samples are airport trips');
select test.ok((select count(*) = 2 and bool_and(gas_price = 0.20) from public.trips where is_sample and fuel = 'electric'), 'the electric samples use a charging price');
select test.ok((select bool_and(model_year is not null) from public.cars where plate = 'SAMPLE'), 'every sample car has a year');
select test.ok((select bool_and(seat_layout is not null) from public.trips where is_sample), 'every sample trip has a seat map');
select test.ok((select count(*) = 7 from public.trip_requests r join public.trips t on t.id = r.trip_id where t.is_sample and r.status = 'approved' and r.seat = any (t.open_seats)), 'made-up riders fill 7 offered seats');
select test.ok((select sum(seats_booked) = 7 from public.trips where is_sample), 'booked seat counts match the made-up riders');
select test.ok((select seats_booked = 1 from public.trips where is_practice), 'the practice ride already has one rider');

-- A real student.
insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000001', 'real10@illinois.edu');
insert into public.profiles (id, full_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Real Student');
insert into public.cars (id, owner_id, make, model, color, plate, mpg, seats)
values ('aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-000000000001', 'Honda', 'Civic', 'Silver', 'ABC', 32, 3);

set role authenticated;
select test.as('aaaaaaaa-0000-0000-0000-000000000001');
select test.fails($$select public.request_seat(t.id, p_seat => t.open_seats[1]) from public.trips t where t.is_sample and t.seats_booked = 0 limit 1$$, 'nobody can request a seat on a sample trip');
select test.fails($$select public.request_seat((select id from public.trips where is_practice), p_seat => 'back_left')$$, 'a taken seat on the practice ride cannot be picked');
select test.ok(public.request_seat((select id from public.trips where is_practice), p_seat => 'front') is not null, 'anyone can request a seat on the practice ride');
select test.ok((select status = 'approved' and seat = 'front' from public.trip_requests where rider_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'practice requests are approved right away');
select test.ok((select seats_booked = 2 from public.trips where is_practice), 'the practice ride counts the new rider');
select test.ok(public.is_trip_member((select id from public.trips where is_practice)), 'joining the practice ride unlocks its group chat');
select public.cancel_request((select id from public.trip_requests where rider_id = 'aaaaaaaa-0000-0000-0000-000000000001'));
select test.ok((select seats_booked = 1 from public.trips where is_practice), 'cancelling the practice seat frees it again');
insert into public.trips (id, driver_id, car_id, is_sample, is_practice, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg)
values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000c1', true, true,
  'Union', 'x', 40.1, -88.2, 'Indy', 'y', 39.8, -86.2, 120, now() + interval '2 days', 3, 'Union', 3.49, 32);
select test.ok((select not is_sample and not is_practice from public.trips where id = 'aaaaaaaa-0000-0000-0000-0000000000e1'), 'trips posted from the app are never samples or practice rides');
reset role;

-- Removing samples leaves real trips alone.
select set_config('request.jwt.claim.sub', '', false);
\ir ../seed/remove_sample_trips.sql
select test.ok((select count(*) = 0 from public.trips where is_sample or is_practice), 'the removal file deletes every sample trip and the practice ride');
select test.ok((select count(*) = 0 from auth.users where email like 'hitchillini.sample%'), 'the removal file deletes every sample driver');
select test.ok((select count(*) = 1 from public.trips where id = 'aaaaaaaa-0000-0000-0000-0000000000e1'), 'real trips are untouched');
