-- Phase 5: trust & safety. Reviews, reports, blocks and odometer photos.
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.

---------------------------------------------------------------------------
-- 1. Who actually rode in a trip's car: the driver plus approved riders.
---------------------------------------------------------------------------
create or replace function public.was_in_trip(p_trip_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.trips where id = p_trip_id and driver_id = p_user_id)
      or exists (
        select 1 from public.trip_requests
        where trip_id = p_trip_id and rider_id = p_user_id and status = 'approved'
      );
$$;

---------------------------------------------------------------------------
-- 2. Reviews: after a trip (for 14 days), rate each other person in the car.
--    Public, one review per person per trip, and they can't be edited.
---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (trip_id, reviewer_id, reviewee_id),
  check (reviewer_id <> reviewee_id)
);

create index reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);

alter table public.reviews enable row level security;

create policy "Signed-in users can read reviews"
  on public.reviews for select to authenticated
  using (true);

create policy "People in the car can review each other after the trip"
  on public.reviews for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and public.was_in_trip(trip_id, reviewer_id)
    and public.was_in_trip(trip_id, reviewee_id)
    and exists (
      select 1 from public.trips t
      where t.id = trip_id
        and t.status <> 'cancelled'
        and t.departure_at <= now()
        and t.departure_at > now() - interval '14 days'
    )
  );

-- Average rating and count for many people at once.
create or replace function public.rating_summary(p_user_ids uuid[])
returns table (user_id uuid, average numeric, count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.reviewee_id, round(avg(r.rating), 1), count(*)::integer
  from public.reviews r
  where r.reviewee_id = any (p_user_ids) and auth.uid() is not null
  group by r.reviewee_id;
$$;

---------------------------------------------------------------------------
-- 3. Reports: private. Only the reporter (and you, in the dashboard) can see them.
---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete set null,
  reason text not null check (reason in ('unsafe_driving', 'harassment', 'no_show', 'payment', 'fake_profile', 'other')),
  details text check (char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

alter table public.reports enable row level security;

create policy "You can see your own reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

create policy "You can report someone"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

---------------------------------------------------------------------------
-- 4. Blocks: you can't request a blocked person's trips (or they yours),
--    and the app hides their trips from you.
---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "You can see who you blocked"
  on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "You can block someone"
  on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "You can unblock someone"
  on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- Everyone you blocked or who blocked you (ids only), so the app can hide their trips.
create or replace function public.blocked_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select blocked_id from public.blocks where blocker_id = auth.uid()
  union
  select blocker_id from public.blocks where blocked_id = auth.uid();
$$;

-- Requests and approvals between blocked people are refused, whichever way they happen.
create or replace function public.check_request_not_blocked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_driver uuid;
begin
  if new.status in ('pending', 'approved') then
    select driver_id into v_driver from public.trips where id = new.trip_id;
    if public.is_blocked_between(new.rider_id, v_driver) then
      raise exception 'You can''t join this trip.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trip_requests_not_blocked
  before insert or update of status on public.trip_requests
  for each row execute function public.check_request_not_blocked();

---------------------------------------------------------------------------
-- 5. Odometer photos (optional): the driver adds a start and end photo.
--    Only people in the car can see them. Prices still use the route distance.
---------------------------------------------------------------------------
create table public.odometer_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  kind text not null check (kind in ('start', 'end')),
  path text not null check (char_length(path) <= 300), -- where the photo is in Storage
  created_at timestamptz not null default now(),
  unique (trip_id, kind)
);

alter table public.odometer_photos enable row level security;

create policy "People in the car can see odometer photos"
  on public.odometer_photos for select to authenticated
  using (public.was_in_trip(trip_id, (select auth.uid())));

create policy "The driver can add odometer photos"
  on public.odometer_photos for insert to authenticated
  with check (exists (select 1 from public.trips where id = trip_id and driver_id = (select auth.uid())));

create policy "The driver can replace odometer photos"
  on public.odometer_photos for update to authenticated
  using (exists (select 1 from public.trips where id = trip_id and driver_id = (select auth.uid())));

create policy "The driver can remove odometer photos"
  on public.odometer_photos for delete to authenticated
  using (exists (select 1 from public.trips where id = trip_id and driver_id = (select auth.uid())));

-- A private Storage bucket. Files live at odometer/<trip id>/<start|end>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('odometer', 'odometer', false, 5242880, array['image/jpeg', 'image/png', 'image/heic'])
on conflict (id) do nothing;

create policy "Trip drivers can upload odometer photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'odometer'
    and exists (select 1 from public.trips t where t.id::text = (storage.foldername(name))[1] and t.driver_id = (select auth.uid()))
  );

create policy "Trip drivers can replace odometer photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'odometer'
    and exists (select 1 from public.trips t where t.id::text = (storage.foldername(name))[1] and t.driver_id = (select auth.uid()))
  );

create policy "People in the car can view odometer photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'odometer'
    and exists (
      select 1 from public.trips t
      where t.id::text = (storage.foldername(name))[1] and public.was_in_trip(t.id, (select auth.uid()))
    )
  );

---------------------------------------------------------------------------
-- 6. Phone numbers: private. Only revealed between a driver and the riders
--    they approved, on that trip, so people can text or call each other.
---------------------------------------------------------------------------
create table public.contact_info (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text not null check (phone ~ '^\+[0-9]{10,15}$'), -- stored like +12175550123
  updated_at timestamptz not null default now()
);

create trigger contact_info_set_updated_at
  before update on public.contact_info
  for each row execute function public.set_updated_at();

alter table public.contact_info enable row level security;

create policy "You can see your own phone number"
  on public.contact_info for select to authenticated
  using (user_id = (select auth.uid()));

create policy "You can add your phone number"
  on public.contact_info for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "You can change your phone number"
  on public.contact_info for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "You can remove your phone number"
  on public.contact_info for delete to authenticated
  using (user_id = (select auth.uid()));

-- Phone numbers of everyone else in the car, for people in the car only.
create or replace function public.trip_contacts(p_trip_id uuid)
returns table (user_id uuid, first_name text, phone text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  with members as (
    select t.driver_id as user_id, 'driver' as role
    from public.trips t
    where t.id = p_trip_id and t.status <> 'cancelled'
    union
    select r.rider_id, 'rider'
    from public.trip_requests r
    join public.trips t on t.id = r.trip_id
    where r.trip_id = p_trip_id and r.status = 'approved' and t.status <> 'cancelled'
  )
  select m.user_id, split_part(trim(p.full_name), ' ', 1), c.phone, m.role
  from members m
  join public.profiles p on p.id = m.user_id
  join public.contact_info c on c.user_id = m.user_id
  where m.user_id <> auth.uid()
    and auth.uid() in (select user_id from members);
$$;

revoke execute on function public.was_in_trip, public.rating_summary, public.is_blocked_between, public.blocked_user_ids, public.trip_contacts from public, anon;
grant execute on function public.was_in_trip, public.rating_summary, public.is_blocked_between, public.blocked_user_ids, public.trip_contacts to authenticated;
