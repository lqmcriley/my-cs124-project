-- Reliability: late cancels, price lock, no-shows, reliability totals.
-- Run with: npm run test:db

-- Setup: Alma drives two trips. Early trip leaves in 2 days, soon trip in 2 hours.
insert into auth.users (id, email) values
  ('33333333-0000-0000-0000-000000000001', 'alma3@illinois.edu'),
  ('33333333-0000-0000-0000-000000000002', 'red3@illinois.edu'),
  ('33333333-0000-0000-0000-000000000003', 'chief3@illinois.edu'),
  ('33333333-0000-0000-0000-000000000004', 'dee3@illinois.edu');
insert into public.profiles (id, full_name) values
  ('33333333-0000-0000-0000-000000000001', 'Alma Mater'),
  ('33333333-0000-0000-0000-000000000002', 'Red Grange'),
  ('33333333-0000-0000-0000-000000000003', 'Chief Ill'),
  ('33333333-0000-0000-0000-000000000004', 'Dee Dee');
insert into public.payment_methods (user_id, venmo_username) values ('33333333-0000-0000-0000-000000000001', 'alma-mater');
insert into public.cars (id, owner_id, make, model, color, plate, mpg, seats)
values ('33333333-0000-0000-0000-0000000000c1', '33333333-0000-0000-0000-000000000001', 'Honda', 'Civic', 'Silver', 'ABC', 32, 3);
insert into public.trips (id, driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg) values
  ('33333333-0000-0000-0000-0000000000e1', '33333333-0000-0000-0000-000000000001', '33333333-0000-0000-0000-0000000000c1',
   'Union', 'x', 40.1, -88.2, 'OHare', 'y', 41.9, -87.9, 150, now() + interval '2 days', 3, 'Union', 3.49, 32),
  ('33333333-0000-0000-0000-0000000000e2', '33333333-0000-0000-0000-000000000001', '33333333-0000-0000-0000-0000000000c1',
   'Union', 'x', 40.1, -88.2, 'Indy', 'y', 39.8, -86.2, 120, now() + interval '2 hours', 3, 'Union', 3.49, 32);

set role authenticated;
-- Red and Chief join both trips; Alma approves everyone.
select test.as('33333333-0000-0000-0000-000000000002');
select test.ok(public.request_seat('33333333-0000-0000-0000-0000000000e1') is not null and public.request_seat('33333333-0000-0000-0000-0000000000e2') is not null, 'setup: Red requests both trips');
select test.as('33333333-0000-0000-0000-000000000003');
select test.ok(public.request_seat('33333333-0000-0000-0000-0000000000e1') is not null and public.request_seat('33333333-0000-0000-0000-0000000000e2') is not null, 'setup: Chief requests both trips');
select test.as('33333333-0000-0000-0000-000000000001');
select test.ok((select count(*) from (select public.respond_to_request(id, true) from public.trip_requests) approvals) = 4, 'setup: Alma approves all four requests');

-- Cancelling 2 days ahead is free --------------------------------------------
select test.as('33333333-0000-0000-0000-000000000002');
select public.cancel_request((select id from public.trip_requests where rider_id = '33333333-0000-0000-0000-000000000002' and trip_id = '33333333-0000-0000-0000-0000000000e1'));
select test.ok((select not late_cancel from public.trip_requests where rider_id = '33333333-0000-0000-0000-000000000002' and trip_id = '33333333-0000-0000-0000-0000000000e1'), 'cancelling 2 days ahead is not a late cancel');
select test.ok((select late_cancel_count = 0 and seats_booked = 1 from public.trips where id = '33333333-0000-0000-0000-0000000000e1'), 'early cancel frees the seat without a late mark');

-- Cancelling 2 hours ahead is late, and the price stays locked -----------------
select public.cancel_request((select id from public.trip_requests where rider_id = '33333333-0000-0000-0000-000000000002' and trip_id = '33333333-0000-0000-0000-0000000000e2'));
select test.ok((select late_cancel from public.trip_requests where rider_id = '33333333-0000-0000-0000-000000000002' and trip_id = '33333333-0000-0000-0000-0000000000e2'), 'cancelling 2 hours ahead is a late cancel');
select test.ok((select seats_booked = 1 and late_cancel_count = 1 from public.trips where id = '33333333-0000-0000-0000-0000000000e2'), 'late cancel frees the seat but still counts toward the split');
select test.ok((select venmo_username from public.trip_payment_handles('33333333-0000-0000-0000-0000000000e2')) = 'alma-mater', 'late canceller still sees the pay buttons (they owe their share)');

-- Driver late cancel ----------------------------------------------------------
select test.as('33333333-0000-0000-0000-000000000001');
update public.trips set status = 'cancelled' where id = '33333333-0000-0000-0000-0000000000e2';
select test.ok((select driver_late_cancel and cancelled_at is not null from public.trips where id = '33333333-0000-0000-0000-0000000000e2'), 'driver cancelling within 24 hours with riders is a late cancel');
select test.fails($$update public.trips set driver_late_cancel = false$$, 'driver cannot erase their late cancel');

-- No-shows ----------------------------------------------------------------------
select test.fails($$select public.set_no_show((select id from public.trip_requests where rider_id = '33333333-0000-0000-0000-000000000003' and trip_id = '33333333-0000-0000-0000-0000000000e1'), true)$$, 'cannot report a no-show before the trip leaves');
reset role;
update public.trips set departure_at = now() - interval '1 hour' where id = '33333333-0000-0000-0000-0000000000e1';
set role authenticated;
select test.as('33333333-0000-0000-0000-000000000003');
select test.fails($$select public.set_no_show((select id from public.trip_requests where rider_id = '33333333-0000-0000-0000-000000000003' and trip_id = '33333333-0000-0000-0000-0000000000e1'), false)$$, 'riders cannot clear their own no-show');
select test.fails($$select public.cancel_request((select id from public.trip_requests where rider_id = '33333333-0000-0000-0000-000000000003' and trip_id = '33333333-0000-0000-0000-0000000000e1'))$$, 'cannot cancel after the trip left');
select test.as('33333333-0000-0000-0000-000000000001');
select public.set_no_show((select id from public.trip_requests where rider_id = '33333333-0000-0000-0000-000000000003' and trip_id = '33333333-0000-0000-0000-0000000000e1'), true);
select test.ok((select no_show from public.trip_requests where rider_id = '33333333-0000-0000-0000-000000000003' and trip_id = '33333333-0000-0000-0000-0000000000e1'), 'driver marks a rider as a no-show');
select test.as('33333333-0000-0000-0000-000000000004');
select test.fails($$select public.report_driver_no_show('33333333-0000-0000-0000-0000000000e1', true)$$, 'outsider cannot report the driver');

-- Reliability totals --------------------------------------------------------------
select test.ok(
  (select completed = 0 and late_cancels = 1 and no_shows = 0 from public.reliability(array['33333333-0000-0000-0000-000000000002'::uuid])),
  'Red: 0 completed, 1 late cancel'
);
select test.ok(
  (select completed = 0 and late_cancels = 0 and no_shows = 1 from public.reliability(array['33333333-0000-0000-0000-000000000003'::uuid])),
  'Chief: no-show counts against him, not as a completed trip'
);
select test.ok(
  (select completed = 1 and late_cancels = 1 and no_shows = 0 from public.reliability(array['33333333-0000-0000-0000-000000000001'::uuid])),
  'Alma: 1 trip driven, 1 late trip cancel'
);
select test.ok((select count(*) = 4 from public.reliability(array[
  '33333333-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002',
  '33333333-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000004']::uuid[])), 'reliability works for many people at once');
reset role;
