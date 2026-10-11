-- Vibe check sliders.
-- Run with: npm run test:db

insert into auth.users (id, email) values
  ('55555555-0000-0000-0000-000000000001', 'alma5@illinois.edu'),
  ('55555555-0000-0000-0000-000000000002', 'red5@illinois.edu');
insert into public.profiles (id, full_name, chat_preference) values
  ('55555555-0000-0000-0000-000000000001', 'Alma Mater', 'quiet'),
  ('55555555-0000-0000-0000-000000000002', 'Red Grange', 'talk');

set role authenticated;
select test.as('55555555-0000-0000-0000-000000000001');
update public.profiles set vibe_music = 4, vibe_temp = 0 where id = '55555555-0000-0000-0000-000000000001';
select test.ok((select vibe_music = 4 and vibe_temp = 0 from public.profiles where id = '55555555-0000-0000-0000-000000000001'), 'you can set your own vibes');
select test.fails($$update public.profiles set vibe_chat = 9 where id = '55555555-0000-0000-0000-000000000001'$$, 'sliders only go from 0 to 4');
update public.profiles set vibe_windows = 0 where id = '55555555-0000-0000-0000-000000000002';
select test.ok((select vibe_windows = 2 from public.profiles where id = '55555555-0000-0000-0000-000000000002'), 'you cannot change someone else''s vibes');
select test.as('55555555-0000-0000-0000-000000000002');
select test.ok((select vibe_music = 4 from public.profiles where id = '55555555-0000-0000-0000-000000000001'), 'everyone signed in can see vibes');
reset role;
