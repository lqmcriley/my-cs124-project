-- Removes every sample driver, sample trip and the practice ride (run before launch).
-- Paste into the Supabase SQL Editor and click Run. Real trips aren't touched.

delete from public.trips where is_sample or is_practice;
delete from auth.users where email like 'hitchillini.sample%@illinois.edu';

select count(*) as sample_trips_left from public.trips where is_sample or is_practice;
