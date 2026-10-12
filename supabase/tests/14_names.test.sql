-- First name, last name and nickname.
-- Run with: npm run test:db

insert into auth.users (id, email) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'lq14@illinois.edu'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'mary14@illinois.edu');

-- Saving from the app: first + last (+ nickname).
set role authenticated;
select test.as('eeeeeeee-0000-0000-0000-000000000001');
insert into public.profiles (id, full_name, first_name, last_name, nickname)
values ('eeeeeeee-0000-0000-0000-000000000001', 'ignored', 'Louis', 'Quinn', ' Quinn ');
select test.ok((select full_name = 'Louis Quinn' from public.profiles where id = 'eeeeeeee-0000-0000-0000-000000000001'), 'full name is built from first + last');
select test.ok((select short_name = 'Quinn' and nickname = 'Quinn' from public.profiles where id = 'eeeeeeee-0000-0000-0000-000000000001'), 'the nickname is the name the app shows');
update public.profiles set nickname = '' where id = 'eeeeeeee-0000-0000-0000-000000000001';
select test.ok((select short_name = 'Louis' and nickname is null from public.profiles where id = 'eeeeeeee-0000-0000-0000-000000000001'), 'without a nickname, the first name is shown');
select test.fails($$update public.profiles set short_name = 'Hacker' where id = 'eeeeeeee-0000-0000-0000-000000000001'$$, 'the shown name cannot be set directly');
select test.fails($$update public.profiles set first_name = '' where id = 'eeeeeeee-0000-0000-0000-000000000001'$$, 'a first name is required');
reset role;

-- Profiles saved before this change keep working.
insert into public.profiles (id, full_name) values ('eeeeeeee-0000-0000-0000-000000000002', 'Mary Ann Smith');
select test.ok((select short_name = 'Mary' and full_name = 'Mary Ann Smith' from public.profiles where id = 'eeeeeeee-0000-0000-0000-000000000002'), 'older profiles show their first word');
