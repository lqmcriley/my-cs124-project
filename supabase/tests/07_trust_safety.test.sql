-- Phase 5: reviews, reports, blocks, odometer photos.
-- Run with: npm run test:db

-- Setup: Alma drives, Red rides (approved), Oscar is an outsider, Bea will get blocked.
insert into auth.users (id, email) values
  ('77777777-0000-0000-0000-000000000001', 'alma7@illinois.edu'),
  ('77777777-0000-0000-0000-000000000002', 'red7@illinois.edu'),
  ('77777777-0000-0000-0000-000000000003', 'oscar7@illinois.edu'),
  ('77777777-0000-0000-0000-000000000004', 'bea7@illinois.edu');
insert into public.profiles (id, full_name) values
  ('77777777-0000-0000-0000-000000000001', 'Alma Mater'),
  ('77777777-0000-0000-0000-000000000002', 'Red Grange'),
  ('77777777-0000-0000-0000-000000000003', 'Oscar Out'),
  ('77777777-0000-0000-0000-000000000004', 'Bea Blocked');
insert into public.cars (id, owner_id, make, model, color, plate, mpg, seats)
values ('77777777-0000-0000-0000-0000000000c1', '77777777-0000-0000-0000-000000000001', 'Honda', 'Civic', 'Silver', 'ABC', 32, 3);
insert into public.trips (id, driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg) values
  ('77777777-0000-0000-0000-0000000000e1', '77777777-0000-0000-0000-000000000001', '77777777-0000-0000-0000-0000000000c1',
   'Union', 'x', 40.1, -88.2, 'OHare', 'y', 41.9, -87.9, 150, now() + interval '1 day', 3, 'Union', 3.49, 32),
  ('77777777-0000-0000-0000-0000000000e2', '77777777-0000-0000-0000-000000000001', '77777777-0000-0000-0000-0000000000c1',
   'Union', 'x', 40.1, -88.2, 'Indy', 'y', 39.8, -86.2, 120, now() + interval '3 days', 3, 'Union', 3.49, 32);

set role authenticated;
select test.as('77777777-0000-0000-0000-000000000002');
select test.ok(public.request_seat('77777777-0000-0000-0000-0000000000e1') is not null, 'setup: Red requests');
select test.as('77777777-0000-0000-0000-000000000001');
select test.ok((select count(*) = 1 from (select public.respond_to_request(id, true) from public.trip_requests) approved), 'setup: Alma approves Red');

-- Reviews -------------------------------------------------------------------
select test.as('77777777-0000-0000-0000-000000000002');
select test.fails($$insert into public.reviews (trip_id, reviewer_id, reviewee_id, rating) values ('77777777-0000-0000-0000-0000000000e1', '77777777-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000001', 5)$$, 'cannot review before the trip leaves');
reset role;
update public.trips set departure_at = now() - interval '1 hour' where id = '77777777-0000-0000-0000-0000000000e1';
set role authenticated;
select test.as('77777777-0000-0000-0000-000000000002');
insert into public.reviews (trip_id, reviewer_id, reviewee_id, rating, comment) values ('77777777-0000-0000-0000-0000000000e1', '77777777-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000001', 5, 'Great driver!');
select test.ok(true, 'rider can review the driver after the trip');
select test.fails($$insert into public.reviews (trip_id, reviewer_id, reviewee_id, rating) values ('77777777-0000-0000-0000-0000000000e1', '77777777-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000001', 1)$$, 'cannot review the same person twice for one trip');
select test.fails($$insert into public.reviews (trip_id, reviewer_id, reviewee_id, rating) values ('77777777-0000-0000-0000-0000000000e1', '77777777-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000002', 5)$$, 'cannot review yourself');
select test.fails($$insert into public.reviews (trip_id, reviewer_id, reviewee_id, rating) values ('77777777-0000-0000-0000-0000000000e1', '77777777-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000003', 1)$$, 'cannot review someone who was not in the car');
update public.reviews set rating = 1;
select test.ok((select rating = 5 from public.reviews), 'reviews cannot be edited');
select test.as('77777777-0000-0000-0000-000000000003');
select test.fails($$insert into public.reviews (trip_id, reviewer_id, reviewee_id, rating) values ('77777777-0000-0000-0000-0000000000e1', '77777777-0000-0000-0000-000000000003', '77777777-0000-0000-0000-000000000001', 1)$$, 'outsiders cannot review');
select test.ok((select average = 5.0 and count = 1 from public.rating_summary(array['77777777-0000-0000-0000-000000000001'::uuid])), 'rating summary shows 5.0 from 1 review');
select test.ok((select count(*) = 1 from public.reviews), 'everyone signed in can read reviews');

-- Reports -------------------------------------------------------------------
insert into public.reports (reporter_id, reported_id, trip_id, reason, details) values ('77777777-0000-0000-0000-000000000003', '77777777-0000-0000-0000-000000000004', null, 'harassment', 'Rude messages');
select test.ok((select count(*) = 1 from public.reports), 'you can file a report and see it');
select test.fails($$insert into public.reports (reporter_id, reported_id, reason) values ('77777777-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000004', 'other')$$, 'cannot file a report as someone else');
select test.as('77777777-0000-0000-0000-000000000004');
select test.ok((select count(*) = 0 from public.reports), 'the reported person cannot see reports');

-- Blocks --------------------------------------------------------------------
select test.as('77777777-0000-0000-0000-000000000001');
insert into public.blocks (blocker_id, blocked_id) values ('77777777-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000004');
select test.as('77777777-0000-0000-0000-000000000004');
select test.fails($$select public.request_seat('77777777-0000-0000-0000-0000000000e2')$$, 'a blocked person cannot request your trips');
select test.ok((select count(*) = 0 from public.blocks), 'blocked person cannot see the block list');
select test.ok('77777777-0000-0000-0000-000000000001'::uuid in (select public.blocked_user_ids()), 'app knows to hide trips between blocked people');
delete from public.blocks where blocker_id = '77777777-0000-0000-0000-000000000001';
select test.ok('77777777-0000-0000-0000-000000000001'::uuid in (select public.blocked_user_ids()), 'blocked person cannot remove the block');
select test.as('77777777-0000-0000-0000-000000000001');
delete from public.blocks where blocked_id = '77777777-0000-0000-0000-000000000004';
select test.as('77777777-0000-0000-0000-000000000004');
select test.ok(public.request_seat('77777777-0000-0000-0000-0000000000e2') is not null, 'after unblocking, requests work again');

-- Odometer photos ------------------------------------------------------------
select test.as('77777777-0000-0000-0000-000000000001');
insert into public.odometer_photos (trip_id, kind, path) values ('77777777-0000-0000-0000-0000000000e1', 'start', '77777777-0000-0000-0000-0000000000e1/start');
insert into storage.objects (bucket_id, name) values ('odometer', '77777777-0000-0000-0000-0000000000e1/start');
select test.ok(true, 'driver can add an odometer photo');
select test.as('77777777-0000-0000-0000-000000000002');
select test.ok((select count(*) = 1 from public.odometer_photos) and (select count(*) = 1 from storage.objects where bucket_id = 'odometer'), 'riders in the car can see odometer photos');
select test.fails($$insert into public.odometer_photos (trip_id, kind, path) values ('77777777-0000-0000-0000-0000000000e1', 'end', 'x')$$, 'riders cannot add odometer photos');
select test.as('77777777-0000-0000-0000-000000000003');
select test.ok((select count(*) = 0 from public.odometer_photos) and (select count(*) = 0 from storage.objects where bucket_id = 'odometer'), 'outsiders cannot see odometer photos');
select test.fails($$insert into storage.objects (bucket_id, name) values ('odometer', '77777777-0000-0000-0000-0000000000e1/end')$$, 'outsiders cannot upload to the trip''s photos');
-- Blocking after a request also stops the approval.
select test.as('77777777-0000-0000-0000-000000000001');
insert into public.blocks (blocker_id, blocked_id) values ('77777777-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000004');
select test.fails($$select public.respond_to_request((select id from public.trip_requests where rider_id = '77777777-0000-0000-0000-000000000004' and status = 'pending'), true)$$, 'cannot approve someone you blocked');
-- Phone numbers -----------------------------------------------------------------
reset role;
insert into public.contact_info (user_id, phone) values
  ('77777777-0000-0000-0000-000000000001', '+12175550101'),
  ('77777777-0000-0000-0000-000000000002', '+12175550102'),
  ('77777777-0000-0000-0000-000000000003', '+12175550103'),
  ('77777777-0000-0000-0000-000000000004', '+12175550104');
set role authenticated;
select test.as('77777777-0000-0000-0000-000000000002'); -- Red, approved on trip e1
select test.ok((select phone = '+12175550101' and role = 'driver' from public.trip_contacts('77777777-0000-0000-0000-0000000000e1')), 'approved rider sees the driver''s number');
select test.ok((select count(*) = 1 from public.contact_info), 'you can only read your own number directly');
select test.as('77777777-0000-0000-0000-000000000001'); -- Alma, the driver
select test.ok((select phone = '+12175550102' from public.trip_contacts('77777777-0000-0000-0000-0000000000e1')), 'driver sees the approved rider''s number');
select test.ok((select count(*) = 0 from public.trip_contacts('77777777-0000-0000-0000-0000000000e2')), 'pending riders'' numbers stay hidden from the driver');
select test.as('77777777-0000-0000-0000-000000000004'); -- Bea, only pending on e2
select test.ok((select count(*) = 0 from public.trip_contacts('77777777-0000-0000-0000-0000000000e2')), 'a pending rider cannot see the driver''s number');
select test.as('77777777-0000-0000-0000-000000000003'); -- Oscar, outsider
select test.ok((select count(*) = 0 from public.trip_contacts('77777777-0000-0000-0000-0000000000e1')), 'outsiders see no numbers');
select test.fails($$insert into public.contact_info (user_id, phone) values ('77777777-0000-0000-0000-000000000003', 'call me')$$, 'phone numbers must look like +12175550123');
reset role;
