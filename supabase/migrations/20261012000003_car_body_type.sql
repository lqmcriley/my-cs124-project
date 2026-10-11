-- Car body style, used to draw the right car shape (sedan, SUV, pickup...).
-- Run this in the Supabase dashboard → SQL Editor after the earlier migrations.

alter table public.cars
  add column body_type text not null default 'sedan'
  check (body_type in ('sedan', 'hatchback', 'suv', 'pickup', 'minivan', 'coupe'));
