-- "Vibe check": how each person likes a ride, on 5-stop sliders (0 to 4).
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.

alter table public.profiles
  add column vibe_chat smallint not null default 2 check (vibe_chat between 0 and 4),       -- quiet ride ↔ talk my ear off
  add column vibe_music smallint not null default 2 check (vibe_music between 0 and 4),     -- no music ↔ aux cord DJ
  add column vibe_temp smallint not null default 2 check (vibe_temp between 0 and 4),       -- keep it cold ↔ crank the heat
  add column vibe_windows smallint not null default 2 check (vibe_windows between 0 and 4), -- windows up ↔ windows down
  add column vibe_stops smallint not null default 2 check (vibe_stops between 0 and 4);     -- straight there ↔ snack stops

-- Start everyone's chat slider from their old "Quiet ride / Down to talk" choice.
update public.profiles set vibe_chat = case when chat_preference = 'quiet' then 0 else 3 end;
