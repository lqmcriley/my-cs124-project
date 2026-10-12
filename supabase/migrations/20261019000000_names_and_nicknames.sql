-- First name, last name and an optional nickname ("Louis Quinn", goes by "Quinn").
-- `full_name` stays (first + last) so nothing else breaks, and `short_name` is
-- what the app shows when it uses one name: the nickname if set, else the first name.
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.

alter table public.profiles
  add column first_name text check (char_length(trim(first_name)) between 1 and 40),
  add column last_name text check (char_length(trim(last_name)) <= 40),
  add column nickname text check (char_length(trim(nickname)) <= 30);

-- Split existing names: first word = first name, the rest = last name.
update public.profiles
set first_name = split_part(trim(full_name), ' ', 1),
    last_name = nullif(trim(substr(trim(full_name), char_length(split_part(trim(full_name), ' ', 1)) + 1)), '');

-- Keep full_name in step with first + last.
create or replace function public.profiles_sync_full_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.first_name is not null then
    new.full_name := trim(trim(new.first_name) || ' ' || coalesce(trim(new.last_name), ''));
  end if;
  new.nickname := nullif(trim(new.nickname), '');
  return new;
end;
$$;

create trigger profiles_sync_full_name
  before insert or update on public.profiles
  for each row execute function public.profiles_sync_full_name();

-- The one name to show: nickname, else first name.
alter table public.profiles
  add column short_name text generated always as (
    coalesce(nullif(trim(nickname), ''), nullif(trim(first_name), ''), split_part(trim(full_name), ' ', 1))
  ) stored;

---------------------------------------------------------------------------
-- Functions that show one name now use short_name.
---------------------------------------------------------------------------
create or replace function public.trip_riders(p_trip_id uuid)
returns table (rider_id uuid, first_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.short_name, p.avatar_url
  from public.trip_requests r
  join public.profiles p on p.id = r.rider_id
  where r.trip_id = p_trip_id
    and r.status = 'approved'
    and auth.uid() is not null
  order by r.decided_at;
$$;

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
  select m.user_id, p.short_name, c.phone, m.role
  from members m
  join public.profiles p on p.id = m.user_id
  join public.contact_info c on c.user_id = m.user_id
  where m.user_id <> auth.uid()
    and auth.uid() in (select user_id from members);
$$;

create or replace function public.trip_seats(p_trip_id uuid)
returns table (seat text, status text, is_me boolean, first_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.seat,
    r.status,
    r.rider_id = auth.uid(),
    case when r.status = 'approved' or r.rider_id = auth.uid() or t.driver_id = auth.uid()
      then p.short_name end,
    case when r.status = 'approved' or r.rider_id = auth.uid() or t.driver_id = auth.uid()
      then p.avatar_url end
  from public.trip_requests r
  join public.trips t on t.id = r.trip_id
  join public.profiles p on p.id = r.rider_id
  where r.trip_id = p_trip_id
    and r.seat is not null
    and r.status in ('pending', 'approved')
    and auth.uid() is not null;
$$;
