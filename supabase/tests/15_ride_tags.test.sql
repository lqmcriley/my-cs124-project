-- Ride style tags.
-- Run with: npm run test:db

insert into auth.users (id, email) values ('ffffffff-0000-0000-0000-000000000001', 'tags15@illinois.edu');
insert into public.profiles (id, full_name) values ('ffffffff-0000-0000-0000-000000000001', 'Tag Tester');

set role authenticated;
select test.as('ffffffff-0000-0000-0000-000000000001');
update public.profiles set ride_tags = array['quiet', 'snacks'] where id = 'ffffffff-0000-0000-0000-000000000001';
select test.ok((select ride_tags = array['quiet', 'snacks'] from public.profiles where id = 'ffffffff-0000-0000-0000-000000000001'), 'you can pick ride style tags');
select test.fails($$update public.profiles set ride_tags = array['quiet', 'chatty'] where id = 'ffffffff-0000-0000-0000-000000000001'$$, 'opposite tags cannot both be picked');
select test.fails($$update public.profiles set ride_tags = array['music', 'podcasts', 'snacks', 'early_bird', 'pet_friendly'] where id = 'ffffffff-0000-0000-0000-000000000001'$$, 'at most 4 tags');
select test.fails($$update public.profiles set ride_tags = array['rocket'] where id = 'ffffffff-0000-0000-0000-000000000001'$$, 'only known tags are allowed');
reset role;
