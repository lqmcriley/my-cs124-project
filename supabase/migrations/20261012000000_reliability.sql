-- Reliability: late cancels, no-shows, a price lock, and a public reliability score.
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.
--
-- Rules:
--   * Cancelling an approved seat within 24 hours of departure is a "late cancel".
--     The seat reopens, but the rider still owes their share, so the people who
--     stay never pay more (the "price lock").
--   * A driver who cancels within 24 hours with riders booked gets a late cancel.
--   * After the trip (up to 7 days), the driver can mark a rider as a no-show,
--     and a rider can report that the driver never showed up.
--   * Anyone signed in can see each person's totals (not the details).

---------------------------------------------------------------------------
-- 1. New columns. Clients can't write these directly (they're not in any
--    update grant and requests have no update policy); the functions below do.
---------------------------------------------------------------------------
alter table public.trip_requests
  add column cancelled_at timestamptz,
  add column late_cancel boolean not null default false,
  add column no_show boolean not null default false, -- driver says the rider didn't come
  add column driver_no_show boolean not null default false; -- rider says the driver didn't come

alter table public.trips
  add column late_cancel_count smallint not null default 0 check (late_cancel_count >= 0),
  add column cancelled_at timestamptz,
  add column driver_late_cancel boolean not null default false;

---------------------------------------------------------------------------
-- 2. Cancelling a request: free until 24 hours before departure, "late" after.
---------------------------------------------------------------------------
create or replace function public.cancel_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.trip_requests;
  v_trip public.trips;
  v_late boolean;
begin
  select * into v_request from public.trip_requests where id = p_request_id for update;
  if not found or v_request.rider_id is distinct from auth.uid() then
    raise exception 'Request not found.';
  end if;
  if v_request.status not in ('pending', 'approved') then
    raise exception 'This request is already closed.';
  end if;

  select * into v_trip from public.trips where id = v_request.trip_id for update;
  if v_trip.departure_at <= now() then
    raise exception 'This trip already left.';
  end if;

  -- Only an approved seat counts as a late cancel; withdrawing a pending request is always free.
  v_late := v_request.status = 'approved' and v_trip.departure_at - now() < interval '24 hours';

  update public.trip_requests
  set status = 'cancelled', decided_at = now(), cancelled_at = now(), late_cancel = v_late
  where id = p_request_id;

  if v_request.status = 'approved' then
    update public.trips
    set seats_booked = greatest(seats_booked - 1, 0),
        late_cancel_count = late_cancel_count + (case when v_late then 1 else 0 end)
    where id = v_trip.id;
  end if;
end;
$$;

---------------------------------------------------------------------------
-- 3. When a driver cancels a trip, record when, and whether it was late.
---------------------------------------------------------------------------
create or replace function public.on_trip_cancelled()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at := now();
    new.driver_late_cancel := old.seats_booked > 0 and old.departure_at - now() < interval '24 hours';
  end if;
  return new;
end;
$$;

create trigger trips_on_cancel
  before update of status on public.trips
  for each row execute function public.on_trip_cancelled();

---------------------------------------------------------------------------
-- 4. No-show reports, open for 7 days after departure.
---------------------------------------------------------------------------
create or replace function public.set_no_show(p_request_id uuid, p_no_show boolean)
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
    raise exception 'Only the driver can report a no-show.';
  end if;
  if v_request.status <> 'approved' then
    raise exception 'Only riders on the trip can be marked as a no-show.';
  end if;
  if v_trip.departure_at > now() or v_trip.departure_at < now() - interval '7 days' then
    raise exception 'No-shows can be reported for 7 days after the trip leaves.';
  end if;
  update public.trip_requests set no_show = p_no_show where id = p_request_id;
end;
$$;

create or replace function public.report_driver_no_show(p_trip_id uuid, p_no_show boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip public.trips;
begin
  select * into v_trip from public.trips where id = p_trip_id;
  if not found then
    raise exception 'Trip not found.';
  end if;
  if not exists (
    select 1 from public.trip_requests
    where trip_id = p_trip_id and rider_id = auth.uid() and status = 'approved'
  ) then
    raise exception 'Only riders on the trip can report the driver.';
  end if;
  if v_trip.departure_at > now() or v_trip.departure_at < now() - interval '7 days' then
    raise exception 'No-shows can be reported for 7 days after the trip leaves.';
  end if;
  update public.trip_requests
  set driver_no_show = p_no_show
  where trip_id = p_trip_id and rider_id = auth.uid() and status = 'approved';
end;
$$;

---------------------------------------------------------------------------
-- 5. Payments now include late cancellers (they still owe their share).
---------------------------------------------------------------------------
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
  if not (v_request.status = 'approved' or v_request.late_cancel) then
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
      where r.trip_id = t.id and r.rider_id = auth.uid() and (r.status = 'approved' or r.late_cancel)
    );
$$;

---------------------------------------------------------------------------
-- 6. Reliability totals for a list of people (for profiles, cards, requests).
--    completed    = trips you drove (with riders) or rode, that happened
--    late_cancels = seats or trips you cancelled within 24 hours
--    no_shows     = times you were reported as not showing up
---------------------------------------------------------------------------
create or replace function public.reliability(p_user_ids uuid[])
returns table (user_id uuid, completed integer, late_cancels integer, no_shows integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    (
      (select count(*) from public.trips t
        where t.driver_id = u.id and t.status <> 'cancelled' and t.departure_at < now() and t.seats_booked > 0
          and not exists (select 1 from public.trip_requests r where r.trip_id = t.id and r.driver_no_show))
      + (select count(*) from public.trip_requests r join public.trips t on t.id = r.trip_id
        where r.rider_id = u.id and r.status = 'approved' and t.status <> 'cancelled' and t.departure_at < now() and not r.no_show)
    )::integer,
    (
      (select count(*) from public.trips t where t.driver_id = u.id and t.driver_late_cancel)
      + (select count(*) from public.trip_requests r where r.rider_id = u.id and r.late_cancel)
    )::integer,
    (
      (select count(*) from public.trips t
        where t.driver_id = u.id and exists (select 1 from public.trip_requests r where r.trip_id = t.id and r.driver_no_show))
      + (select count(*) from public.trip_requests r where r.rider_id = u.id and r.no_show)
    )::integer
  from unnest(p_user_ids) as u (id)
  where auth.uid() is not null;
$$;

revoke execute on function public.cancel_request, public.set_no_show, public.report_driver_no_show,
  public.set_request_paid, public.trip_payment_handles, public.reliability from public, anon;
grant execute on function public.cancel_request, public.set_no_show, public.report_driver_no_show,
  public.set_request_paid, public.trip_payment_handles, public.reliability to authenticated;
