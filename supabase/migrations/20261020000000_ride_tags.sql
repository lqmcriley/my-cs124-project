-- Ride style tags replace the vibe check sliders: up to 4 optional tags like
-- "Quiet ride" or "Snack stops". Same list as src/lib/ride-tags.ts.
-- (The old vibe_* columns stay, unused, so nothing that reads them breaks.)
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.

alter table public.profiles
  add column ride_tags text[] not null default '{}' check (
    ride_tags <@ array['quiet', 'chatty', 'music', 'podcasts', 'snacks', 'early_bird', 'night_owl', 'pet_friendly']
    and cardinality(ride_tags) <= 4
    and not (ride_tags @> array['quiet', 'chatty'])
    and not (ride_tags @> array['early_bird', 'night_owl'])
  );

-- Give everyone starter tags from their old sliders.
update public.profiles
set ride_tags = array_remove(array[
  case when vibe_chat <= 1 then 'quiet' when vibe_chat >= 3 then 'chatty' end,
  case when vibe_music >= 3 then 'music' end,
  case when vibe_stops >= 3 then 'snacks' end
], null);
