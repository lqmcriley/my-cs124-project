-- Phase 1: UIUC-only sign-up, profiles, cars, and profile photos.
-- Run this in the Supabase dashboard → SQL Editor (or `supabase db push`).

---------------------------------------------------------------------------
-- 1. Only @illinois.edu emails can create an account.
--    The app checks this too, but this check runs on Supabase's servers,
--    so nobody can get around it with a modified app.
---------------------------------------------------------------------------
create or replace function public.enforce_illinois_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) not like '%@illinois.edu' then
    raise exception 'Halfsies is only for @illinois.edu email addresses';
  end if;
  return new;
end;
$$;

create trigger enforce_illinois_email
  before insert or update of email on auth.users
  for each row execute function public.enforce_illinois_email();

---------------------------------------------------------------------------
-- 2. Helper: keep an updated_at column current on every change.
---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

---------------------------------------------------------------------------
-- 3. Profiles: one row per user. Its id is the same as the login user's id.
---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 80),
  avatar_url text,
  year text check (year in ('Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad')),
  major text check (char_length(major) <= 80),
  bio text check (char_length(bio) <= 200),
  chat_preference text not null default 'talk' check (chat_preference in ('quiet', 'talk')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Any signed-in student can see profiles (riders need to see who's driving).
create policy "Signed-in users can view profiles"
  on public.profiles for select to authenticated
  using (true);

create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

---------------------------------------------------------------------------
-- 4. Cars: a driver has one car. Riders can see it so they know what to look for.
---------------------------------------------------------------------------
create table public.cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  make text not null check (char_length(trim(make)) between 1 and 40),
  model text not null check (char_length(trim(model)) between 1 and 40),
  color text not null check (char_length(trim(color)) between 1 and 30),
  plate text not null check (char_length(trim(plate)) between 1 and 10),
  mpg numeric(5, 1) not null check (mpg between 5 and 150),
  seats smallint not null check (seats between 1 and 7), -- passenger seats, not counting the driver
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger cars_set_updated_at
  before update on public.cars
  for each row execute function public.set_updated_at();

alter table public.cars enable row level security;

create policy "Signed-in users can view cars"
  on public.cars for select to authenticated
  using (true);

create policy "Users can add their own car"
  on public.cars for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own car"
  on public.cars for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can remove their own car"
  on public.cars for delete to authenticated
  using ((select auth.uid()) = owner_id);

---------------------------------------------------------------------------
-- 5. Profile photos: a public "avatars" bucket. Each user can only write
--    inside a folder named after their own user id, e.g. avatars/<id>/avatar.jpg
---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "Users can read their own avatar folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can upload to their own avatar folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can replace their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
