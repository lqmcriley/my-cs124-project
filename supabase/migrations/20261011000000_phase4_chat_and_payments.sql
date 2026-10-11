-- Phase 4: trip group chat and payments.
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.

---------------------------------------------------------------------------
-- 1. Who is "in" a trip: the driver plus approved riders.
---------------------------------------------------------------------------
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trips where id = p_trip_id and driver_id = auth.uid()
  ) or exists (
    select 1 from public.trip_requests
    where trip_id = p_trip_id and rider_id = auth.uid() and status = 'approved'
  );
$$;

---------------------------------------------------------------------------
-- 2. Group chat: one per trip, only for trip members.
---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index messages_trip_idx on public.messages (trip_id, created_at);

alter table public.messages enable row level security;

create policy "Trip members can read the chat"
  on public.messages for select to authenticated
  using (public.is_trip_member(trip_id));

create policy "Trip members can post as themselves"
  on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_trip_member(trip_id));
-- No update/delete: messages are permanent (useful if something goes wrong).

-- Send new messages to phones live (Supabase Realtime). Each phone only
-- receives messages its security rules above allow it to read.
alter publication supabase_realtime add table public.messages;

---------------------------------------------------------------------------
-- 3. Payments: the driver marks each approved rider as paid.
---------------------------------------------------------------------------
alter table public.trip_requests add column paid_at timestamptz;

create or replace function public.set_request_paid(p_request_id uuid, p_paid boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.trip_requests;
  v_trip public.trips;
begin
  select * into v_request from public.trip_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found.';
  end if;
  select * into v_trip from public.trips where id = v_request.trip_id;
  if v_trip.driver_id is distinct from auth.uid() then
    raise exception 'Only the driver can mark riders as paid.';
  end if;
  if v_request.status <> 'approved' then
    raise exception 'Only riders on the trip can be marked paid.';
  end if;
  if v_trip.departure_at > now() then
    raise exception 'You can mark riders paid once the trip has left.';
  end if;

  update public.trip_requests
  set paid_at = case when p_paid then now() else null end
  where id = p_request_id;
end;
$$;

-- The driver's payment handles, but only for approved riders of this trip.
create or replace function public.trip_payment_handles(p_trip_id uuid)
returns table (venmo_username text, cashapp_cashtag text, paypal_username text)
language sql
stable
security definer
set search_path = ''
as $$
  select pm.venmo_username, pm.cashapp_cashtag, pm.paypal_username
  from public.trips t
  join public.payment_methods pm on pm.user_id = t.driver_id
  where t.id = p_trip_id
    and exists (
      select 1 from public.trip_requests r
      where r.trip_id = t.id and r.rider_id = auth.uid() and r.status = 'approved'
    );
$$;

revoke execute on function public.is_trip_member, public.set_request_paid, public.trip_payment_handles from public, anon;
grant execute on function public.is_trip_member, public.set_request_paid, public.trip_payment_handles to authenticated;
