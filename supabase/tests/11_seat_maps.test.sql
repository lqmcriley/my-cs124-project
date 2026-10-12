-- Seat maps: car layouts, offered seats, picking a seat, and seat holds.
-- Run with: npm run test:db

-- Setup: Alma drives. Red, Bea and Oscar ride.
insert into auth.users (id, email) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'alma11@illinois.edu'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'red11@illinois.edu'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'bea11@illinois.edu'),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'oscar11@illinois.edu');
insert into public.profiles (id, full_name) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Alma Mater'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Red Grange'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Bea Rider'),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'Oscar Out');

-- Cars ----------------------------------------------------------------------
insert into public.cars (id, owner_id, make, model, color, plate, mpg, seats)
values ('bbbbbbbb-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-000000000001', 'Honda', 'Civic', 'Silver', 'ABC', 32, 3);
select test.ok((select seat_layout = '4' and seats = 3 from public.cars where id = 'bbbbbbbb-0000-0000-0000-0000000000c1'), 'a car saved without a layout gets one that fits its seats');
update public.cars set seat_layout = '5_cramped' where id = 'bbbbbbbb-0000-0000-0000-0000000000c1';
select test.ok((select seats = 4 from public.cars where id = 'bbbbbbbb-0000-0000-0000-0000000000c1'), 'passenger seats follow the layout');
select test.fails($$update public.cars set seat_layout = '9' where id = 'bbbbbbbb-0000-0000-0000-0000000000c1'$$, 'only known layouts are allowed');

-- Posting a trip with a seat map ----------------------------------------------
set role authenticated;
select test.as('bbbbbbbb-0000-0000-0000-000000000001');
insert into public.trips (id, driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg, seat_layout, open_seats)
values ('bbbbbbbb-0000-0000-0000-0000000000e1', 'bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-0000000000c1',
  'Union', 'x', 40.1, -88.2, 'OHare', 'y', 41.9, -87.9, 150, now() + interval '3 days', 2, 'Union', 3.49, 32, '5_cramped', array['front', 'back_left']);
select test.ok(true, 'a driver can post a trip offering some seats');
select test.fails($$insert into public.trips (driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg, seat_layout, open_seats)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-0000000000c1', 'Union', 'x', 40.1, -88.2, 'OHare', 'y', 41.9, -87.9, 150, now() + interval '3 days', 1, 'Union', 3.49, 32, '5', array['middle_left'])$$,
  'a trip can only offer seats its car has');
select test.fails($$insert into public.trips (driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg, seat_layout, open_seats)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-0000000000c1', 'Union', 'x', 40.1, -88.2, 'OHare', 'y', 41.9, -87.9, 150, now() + interval '3 days', 2, 'Union', 3.49, 32, '5', array['front', 'front'])$$,
  'the same seat cannot be offered twice');
select test.fails($$insert into public.trips (driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg, seat_layout, open_seats)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-0000000000c1', 'Union', 'x', 40.1, -88.2, 'OHare', 'y', 41.9, -87.9, 150, now() + interval '3 days', 3, 'Union', 3.49, 32, '5', array['front'])$$,
  'the seat count must match the seats offered');

-- Picking seats ---------------------------------------------------------------
select test.as('bbbbbbbb-0000-0000-0000-000000000002'); -- Red
select test.fails($$select public.request_seat('bbbbbbbb-0000-0000-0000-0000000000e1')$$, 'you must pick a seat on a trip with a seat map');
select test.fails($$select public.request_seat('bbbbbbbb-0000-0000-0000-0000000000e1', p_seat => 'back_middle')$$, 'you cannot pick a seat the driver is not offering');
select test.ok(public.request_seat('bbbbbbbb-0000-0000-0000-0000000000e1', p_seat => 'front') is not null, 'Red asks for the front seat');
select test.ok((select seat = 'front' and is_me and first_name = 'Red' from public.trip_seats('bbbbbbbb-0000-0000-0000-0000000000e1')), 'Red sees their seat on the map');

select test.as('bbbbbbbb-0000-0000-0000-000000000003'); -- Bea
select test.fails($$select public.request_seat('bbbbbbbb-0000-0000-0000-0000000000e1', p_seat => 'front')$$, 'a waiting request holds its seat');
select test.ok((select status = 'pending' and not is_me and first_name is null from public.trip_seats('bbbbbbbb-0000-0000-0000-0000000000e1') where seat = 'front'), 'others see the front seat as held, without a name');
select test.ok(public.request_seat('bbbbbbbb-0000-0000-0000-0000000000e1', p_seat => 'back_left') is not null, 'Bea takes the back left seat');

select test.as('bbbbbbbb-0000-0000-0000-000000000001'); -- Alma, the driver
select test.ok((select count(*) = 2 and bool_and(first_name is not null) from public.trip_seats('bbbbbbbb-0000-0000-0000-0000000000e1')), 'the driver sees who asked for each seat');
select test.fails($$update public.trips set open_seats = array['back_left', 'back_right'] where id = 'bbbbbbbb-0000-0000-0000-0000000000e1'$$, 'the driver cannot stop offering a held seat');
update public.trips set open_seats = array['front', 'back_left', 'back_right'], seats_offered = 3 where id = 'bbbbbbbb-0000-0000-0000-0000000000e1';
select test.ok((select seats_offered = 3 from public.trips where id = 'bbbbbbbb-0000-0000-0000-0000000000e1'), 'the driver can offer another seat later');
select public.respond_to_request((select id from public.trip_requests where seat = 'front' and trip_id = 'bbbbbbbb-0000-0000-0000-0000000000e1'), true);

select test.as('bbbbbbbb-0000-0000-0000-000000000004'); -- Oscar, an outsider
select test.ok((select first_name = 'Red' and status = 'approved' from public.trip_seats('bbbbbbbb-0000-0000-0000-0000000000e1') where seat = 'front'), 'everyone sees who has an approved seat');

-- Cancelling frees the seat.
select test.as('bbbbbbbb-0000-0000-0000-000000000003'); -- Bea
select public.cancel_request((select id from public.trip_requests where rider_id = 'bbbbbbbb-0000-0000-0000-000000000003'));
select test.as('bbbbbbbb-0000-0000-0000-000000000004'); -- Oscar
select test.ok(public.request_seat('bbbbbbbb-0000-0000-0000-0000000000e1', p_seat => 'back_left') is not null, 'a cancelled seat opens up again');

-- Trips posted before seat maps still work without picking a seat.
select test.as('bbbbbbbb-0000-0000-0000-000000000001');
insert into public.trips (id, driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg)
values ('bbbbbbbb-0000-0000-0000-0000000000e2', 'bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-0000000000c1',
  'Union', 'x', 40.1, -88.2, 'Indy', 'y', 39.8, -86.2, 120, now() + interval '3 days', 2, 'Union', 3.49, 32);
select test.as('bbbbbbbb-0000-0000-0000-000000000003');
select test.ok(public.request_seat('bbbbbbbb-0000-0000-0000-0000000000e2') is not null, 'older trips without a seat map still take requests');
reset role;
