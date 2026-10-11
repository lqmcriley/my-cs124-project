-- Phase 4: group chat and payments.
-- Run with: npm run test:db

-- Setup: Alma drives, Red is approved, Chief is pending, Oscar is an outsider.
insert into auth.users (id, email) values
  ('22222222-0000-0000-0000-000000000001', 'alma2@illinois.edu'),
  ('22222222-0000-0000-0000-000000000002', 'red2@illinois.edu'),
  ('22222222-0000-0000-0000-000000000003', 'chief2@illinois.edu'),
  ('22222222-0000-0000-0000-000000000004', 'oscar@illinois.edu');
insert into public.profiles (id, full_name) values
  ('22222222-0000-0000-0000-000000000001', 'Alma Mater'),
  ('22222222-0000-0000-0000-000000000002', 'Red Grange'),
  ('22222222-0000-0000-0000-000000000003', 'Chief Ill'),
  ('22222222-0000-0000-0000-000000000004', 'Oscar Out');
insert into public.payment_methods (user_id, venmo_username) values ('22222222-0000-0000-0000-000000000001', 'alma-mater');
insert into public.cars (id, owner_id, make, model, color, plate, mpg, seats)
values ('22222222-0000-0000-0000-0000000000c1', '22222222-0000-0000-0000-000000000001', 'Honda', 'Civic', 'Silver', 'ABC', 32, 3);
insert into public.trips (id, driver_id, car_id, origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng, route_miles, departure_at, seats_offered, pickup_spot, gas_price, mpg)
values ('22222222-0000-0000-0000-0000000000f1', '22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-0000000000c1',
  'Union', 'x', 40.1, -88.2, 'OHare', 'y', 41.9, -87.9, 150, now() + interval '1 day', 3, 'Union', 3.49, 32);

set role authenticated;
select test.as('22222222-0000-0000-0000-000000000002');
select public.request_seat('22222222-0000-0000-0000-0000000000f1');
select test.as('22222222-0000-0000-0000-000000000003');
select public.request_seat('22222222-0000-0000-0000-0000000000f1');
select test.as('22222222-0000-0000-0000-000000000001');
select public.respond_to_request((select id from public.trip_requests where rider_id = '22222222-0000-0000-0000-000000000002'), true);

-- Chat ----------------------------------------------------------------------
insert into public.messages (trip_id, sender_id, body) values ('22222222-0000-0000-0000-0000000000f1', '22222222-0000-0000-0000-000000000001', 'Meet at the north door!');
select test.ok(true, 'driver can post');

select test.as('22222222-0000-0000-0000-000000000002'); -- Red (approved)
insert into public.messages (trip_id, sender_id, body) values ('22222222-0000-0000-0000-0000000000f1', '22222222-0000-0000-0000-000000000002', 'See you there');
select test.ok((select count(*) from public.messages) = 2, 'approved rider can read and post');
select test.fails($$insert into public.messages (trip_id, sender_id, body) values ('22222222-0000-0000-0000-0000000000f1', '22222222-0000-0000-0000-000000000001', 'fake')$$, 'cannot post as someone else');
select test.fails($$insert into public.messages (trip_id, sender_id, body) values ('22222222-0000-0000-0000-0000000000f1', '22222222-0000-0000-0000-000000000002', '   ')$$, 'cannot send an empty message');

select test.as('22222222-0000-0000-0000-000000000003'); -- Chief (pending)
select test.ok((select count(*) from public.messages) = 0, 'pending rider cannot read the chat');
select test.fails($$insert into public.messages (trip_id, sender_id, body) values ('22222222-0000-0000-0000-0000000000f1', '22222222-0000-0000-0000-000000000003', 'let me in')$$, 'pending rider cannot post');

select test.as('22222222-0000-0000-0000-000000000004'); -- Oscar (outsider)
select test.ok((select count(*) from public.messages) = 0, 'outsider cannot read the chat');

-- Payment handles -------------------------------------------------------------
select test.as('22222222-0000-0000-0000-000000000002');
select test.ok((select venmo_username from public.trip_payment_handles('22222222-0000-0000-0000-0000000000f1')) = 'alma-mater', 'approved rider sees the driver''s Venmo');
select test.as('22222222-0000-0000-0000-000000000003');
select test.ok((select count(*) from public.trip_payment_handles('22222222-0000-0000-0000-0000000000f1')) = 0, 'pending rider does not see payment handles');
select test.ok((select count(*) from public.payment_methods) = 0, 'nobody can read another person''s handles directly');

-- Mark paid -------------------------------------------------------------------
select test.as('22222222-0000-0000-0000-000000000001');
select test.fails($$select public.set_request_paid((select id from public.trip_requests where rider_id = '22222222-0000-0000-0000-000000000002'), true)$$, 'cannot mark paid before the trip leaves');

reset role;
update public.trips set departure_at = now() - interval '1 hour' where id = '22222222-0000-0000-0000-0000000000f1';
set role authenticated;

select test.as('22222222-0000-0000-0000-000000000002');
select test.fails($$select public.set_request_paid((select id from public.trip_requests where rider_id = '22222222-0000-0000-0000-000000000002'), true)$$, 'rider cannot mark themselves paid');

select test.as('22222222-0000-0000-0000-000000000001');
select test.fails($$select public.set_request_paid((select id from public.trip_requests where rider_id = '22222222-0000-0000-0000-000000000003'), true)$$, 'cannot mark a pending rider paid');
select public.set_request_paid((select id from public.trip_requests where rider_id = '22222222-0000-0000-0000-000000000002'), true);
select test.ok((select paid_at is not null from public.trip_requests where rider_id = '22222222-0000-0000-0000-000000000002'), 'driver marks a rider paid');
select public.set_request_paid((select id from public.trip_requests where rider_id = '22222222-0000-0000-0000-000000000002'), false);
select test.ok((select paid_at is null from public.trip_requests where rider_id = '22222222-0000-0000-0000-000000000002'), 'driver can undo mark paid');

reset role;
select test.ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages'), 'messages are sent live (realtime)');
