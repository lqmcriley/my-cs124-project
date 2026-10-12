-- When a driver moves a booked trip by more than their flexible window (for
-- example their flight landed late), riders are told and can drop out for free:
-- no late cancel, and they owe nothing.
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.

alter table public.trips
  add column previous_departure_at timestamptz, -- the time before the last big move
  add column departure_moved_at timestamptz;    -- when the driver made that move

-- Record big moves on trips that already have riders.
create or replace function public.trips_record_big_move()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.departure_at is distinct from old.departure_at
     and old.seats_booked > 0
     and abs(extract(epoch from new.departure_at - old.departure_at)) / 60 > old.flex_minutes then
    new.previous_departure_at := old.departure_at;
    new.departure_moved_at := now();
  end if;
  return new;
end;
$$;

create trigger trips_record_big_move
  before update of departure_at on public.trips
  for each row execute function public.trips_record_big_move();

-- cancel_request: same as before, except a rider approved before the driver's
-- big move can always drop out for free.
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
  v_moved boolean;
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

  -- Did the driver move the trip a lot after you were approved?
  v_moved := v_trip.departure_moved_at is not null and v_trip.departure_moved_at > coalesce(v_request.decided_at, v_request.created_at);

  -- Only an approved seat counts as a late cancel; withdrawing a pending request is always free.
  v_late := v_request.status = 'approved' and v_trip.departure_at - now() < interval '24 hours' and not v_moved;

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
