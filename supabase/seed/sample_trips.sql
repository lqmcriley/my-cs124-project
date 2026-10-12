-- Sample trips for demos: 10 made-up drivers and 15 upcoming trips from campus.
-- Each one shows a "Sample" tag in the app, and nobody can request a seat.
-- Plus one practice ride (Taylor, tagged "Practice") that anyone can join to
-- try booking: requests on it are approved instantly.
--
-- How to use: paste this whole file into the Supabase SQL Editor and click Run.
-- Dates are relative to today, so run it again any time to refresh them.
-- To remove every sample before launch, run supabase/seed/remove_sample_trips.sql.
--
-- Needs the migrations up to 20261020000000_ride_tags.sql first.

-- Start fresh: remove any earlier samples (trips and cars go with their drivers).
delete from auth.users where email like 'hitchillini.sample%@illinois.edu';

-- "N days from today at HH:MM", in Champaign time.
create or replace function pg_temp.sample_at(days integer, hhmm text) returns timestamptz
language sql as $$
  select ((date_trunc('day', now() at time zone 'America/Chicago') + make_interval(days => days) + hhmm::time) at time zone 'America/Chicago');
$$;

-- Made-up drivers. They can never sign in (banned), so nobody can take over these accounts.
insert into auth.users (id, email, banned_until) values
  ('00000000-5a3b-4e00-8000-000000000001', 'hitchillini.sample01@illinois.edu', 'infinity'),
  ('00000000-5a3b-4e00-8000-000000000002', 'hitchillini.sample02@illinois.edu', 'infinity'),
  ('00000000-5a3b-4e00-8000-000000000003', 'hitchillini.sample03@illinois.edu', 'infinity'),
  ('00000000-5a3b-4e00-8000-000000000004', 'hitchillini.sample04@illinois.edu', 'infinity'),
  ('00000000-5a3b-4e00-8000-000000000005', 'hitchillini.sample05@illinois.edu', 'infinity'),
  ('00000000-5a3b-4e00-8000-000000000006', 'hitchillini.sample06@illinois.edu', 'infinity'),
  ('00000000-5a3b-4e00-8000-000000000007', 'hitchillini.sample07@illinois.edu', 'infinity'),
  ('00000000-5a3b-4e00-8000-000000000008', 'hitchillini.sample08@illinois.edu', 'infinity'),
  ('00000000-5a3b-4e00-8000-000000000009', 'hitchillini.sample09@illinois.edu', 'infinity'),
  ('00000000-5a3b-4e00-8000-000000000011', 'hitchillini.sample11@illinois.edu', 'infinity'),
  ('00000000-5a3b-4e00-8000-000000000010', 'hitchillini.sample10@illinois.edu', 'infinity');

insert into public.profiles (id, full_name, year, major, bio, chat_preference, ride_tags) values
  ('00000000-5a3b-4e00-8000-000000000001', 'Maya Rodriguez', 'Junior', 'Industrial Design', 'Home to the suburbs most weekends. Snacks provided.', 'talk', array['chatty', 'music', 'snacks']),
  ('00000000-5a3b-4e00-8000-000000000002', 'Ethan Park', 'Senior', 'Computer Science', 'Flying out of O''Hare a lot for interviews.', 'quiet', array['quiet']),
  ('00000000-5a3b-4e00-8000-000000000003', 'Priya Shah', 'Sophomore', 'Molecular & Cellular Biology', 'Indy is home. Podcasts or quiet, your call.', 'talk', array['early_bird']),
  ('00000000-5a3b-4e00-8000-000000000004', 'Jordan Ellis', 'Grad', 'Civil Engineering', 'Big van, lots of room for luggage.', 'talk', array['snacks']),
  ('00000000-5a3b-4e00-8000-000000000005', 'Sam Okafor', 'Junior', 'Finance', 'St. Louis native. Aux is open.', 'talk', array['chatty', 'music']),
  ('00000000-5a3b-4e00-8000-000000000006', 'Hannah Kowalski', 'Senior', 'Agricultural Engineering', 'Truck has a covered bed, so bring the big suitcase.', 'talk', array['music', 'early_bird']),
  ('00000000-5a3b-4e00-8000-000000000007', 'Leo Nguyen', 'Sophomore', 'Music', 'Small car, good playlists.', 'talk', array['chatty', 'music']),
  ('00000000-5a3b-4e00-8000-000000000008', 'Ava Thompson', 'Junior', 'Psychology', 'Driving home to Minneapolis for breaks.', 'talk', array['snacks']),
  ('00000000-5a3b-4e00-8000-000000000009', 'Marcus Bell', 'Grad', 'Physics', 'Two seats in the back. Tight but comfy.', 'quiet', array['quiet', 'music', 'early_bird']),
  ('00000000-5a3b-4e00-8000-000000000011', 'Taylor Practice', 'Senior', 'Practice driver', 'I''m a practice driver. Join my ride to see how Hitch Illini works. Nobody is really driving.', 'talk', '{}'),
  ('00000000-5a3b-4e00-8000-000000000010', 'Grace Lin', 'Senior', 'Accountancy', 'Very on time. Very precise gas math.', 'quiet', array['quiet']);

-- Passenger seats are filled in from the seat layout.
insert into public.cars (id, owner_id, make, model, color, body_type, mpg, seats, seat_layout, model_year, fuel, plate) values
  ('00000000-5a3b-4e00-8001-000000000001', '00000000-5a3b-4e00-8000-000000000001', 'Honda', 'Civic', 'Blue', 'sedan', 34, 1, '5', 2019, 'regular', 'SAMPLE'),
  ('00000000-5a3b-4e00-8001-000000000002', '00000000-5a3b-4e00-8000-000000000002', 'Toyota', 'RAV4 Hybrid', 'Silver', 'suv', 40, 1, '5_cramped', 2021, 'hybrid', 'SAMPLE'),
  ('00000000-5a3b-4e00-8001-000000000003', '00000000-5a3b-4e00-8000-000000000003', 'Toyota', 'Corolla', 'White', 'sedan', 35, 1, '5_cramped', 2020, 'regular', 'SAMPLE'),
  ('00000000-5a3b-4e00-8001-000000000004', '00000000-5a3b-4e00-8000-000000000004', 'Honda', 'Odyssey', 'Gray', 'minivan', 24, 1, '8', 2015, 'regular', 'SAMPLE'),
  ('00000000-5a3b-4e00-8001-000000000005', '00000000-5a3b-4e00-8000-000000000005', 'Mazda', '3 Hatchback', 'Red', 'hatchback', 33, 1, '5_cramped', 2018, 'regular', 'SAMPLE'),
  ('00000000-5a3b-4e00-8001-000000000006', '00000000-5a3b-4e00-8000-000000000006', 'Ford', 'F-150', 'Black', 'pickup', 20, 1, '5', 2016, 'regular', 'SAMPLE'),
  ('00000000-5a3b-4e00-8001-000000000007', '00000000-5a3b-4e00-8000-000000000007', 'Honda', 'Fit', 'Green', 'hatchback', 36, 1, '4', 2014, 'regular', 'SAMPLE'),
  ('00000000-5a3b-4e00-8001-000000000008', '00000000-5a3b-4e00-8000-000000000008', 'Subaru', 'Outback', 'Green', 'suv', 29, 1, '5', 2021, 'regular', 'SAMPLE'),
  ('00000000-5a3b-4e00-8001-000000000009', '00000000-5a3b-4e00-8000-000000000009', 'Ford', 'Mustang', 'Orange', 'coupe', 24, 1, '4', 2012, 'premium', 'SAMPLE'),
  ('00000000-5a3b-4e00-8001-000000000011', '00000000-5a3b-4e00-8000-000000000011', 'Toyota', 'Camry', 'Blue', 'sedan', 33, 1, '5_cramped', 2018, 'regular', 'SAMPLE'),
  ('00000000-5a3b-4e00-8001-000000000010', '00000000-5a3b-4e00-8000-000000000010', 'Tesla', 'Model 3', 'White', 'sedan', 4, 1, '5_cramped', 2022, 'electric', 'SAMPLE');

insert into public.trips (
  id, driver_id, car_id, is_sample, is_practice,
  origin_name, origin_address, origin_lat, origin_lng, dest_name, dest_address, dest_lat, dest_lng,
  route_miles, route_minutes, route_polyline,
  departure_at, seats_offered, pickup_spot, luggage, notes, gas_price, mpg,
  is_airport, flight_number, flight_departs_at, flight_international, parking, parking_location, shuttle_minutes, long_trip_plan, overnight_stop,
  seat_layout, open_seats
) values
  -- 1. Illini Union → O'Hare International Airport (150.2 mi, ~2.6 h)
  ('00000000-5a3b-4e00-8002-000000000001', '00000000-5a3b-4e00-8000-000000000002', '00000000-5a3b-4e00-8001-000000000002', true, false,
   'Illini Union', '1401 W Green St, Urbana, IL', 40.10921, -88.22722, 'O''Hare International Airport', '10000 W O''Hare Ave, Chicago, IL 60666', 41.98026, -87.90899,
   150.2, 153, $poly$qyxsFjvnyO{E`N}d@Ro@z\qaALDf^yaH|Cih@jZwsGk`GcaHquB{fHeFyuHkmFe_L_`E{eDiM{{GkdDefBgG}gDqhC{fHuHcd@oVuiAmyAwf@yR}kAe@qmA}Uu{DjDgeBcs@i{CtBclBmoBae@ySudFvAopAeu@gtFiCwfA{m@wiCkMoxBeaC_aEukB_w@yeBcd@y_@evBaKokH{{B}wAqGaeJgkCyk@qdAwO}}Csy@c_Ay}IxGifCzx@g_@t}AuYtXytGhGy~P{rGcvFcr@i`EksEkaDaxBilHqVc_GqyAw{M}Amz@iy@arEkeHewA~z@oMx`BqV`c@gaCboAqrB|jG{j@lk@mtBxp@kvAriBwgA`i@mv@xgAmw@dqB{El}Am~Aj{F}n@hx@kiDfMitDtz@auAdI_oBKulAeQyeA`VsaCzA{[pW}x@zlBoCoNkoGk@nNi_@yJizDiWrQyArVgg@{PD~b@uPYcOrW{JiBxDmYwYaSXaV$poly$,
   pg_temp.sample_at(2, '13:00'), 3, 'Illini Union', 'large', 'Meeting at the Green St entrance. Room for checked bags.', 3.29, 40,
   true, 'UA 1428', pg_temp.sample_at(2, '18:05'), false, 'terminal', null, 0, null, null,
   '5_cramped', array['front', 'back_left', 'back_right']),
  -- 2. ISR dorms → Naperville (134.3 mi, ~2.3 h)
  ('00000000-5a3b-4e00-8002-000000000002', '00000000-5a3b-4e00-8000-000000000001', '00000000-5a3b-4e00-8001-000000000001', true, false,
   'ISR dorms', '1010 W Illinois St, Urbana, IL', 40.11011, -88.22174, 'Naperville', 'Naperville, IL', 41.75084, -88.15354,
   134.3, 138, $poly${}xsFj{myOwBhJkhB~@V|yAyaH|Cih@jZwsGk`GcaHquB{fHeFyuHkmFe_L_`E{eDiM{{GkdDefBgG}gDqhC{fHuHcd@oVuiAmyAwf@yR}kAe@qmA}Uu{DjDgeBcs@i{CtBclBmoBae@ySudFvAopAeu@gtFiCwfA{m@{cC{Juj@}\urAweB_aEukB_w@yeBcd@y_@evBaKokH{{B}wAqGaeJgkCyk@qdA{TiiDcc@gj@kk@cNujIrOm~Btv@g_@t}AgWrWadDxGe_@wHeCthAem[z_@JddNgee@vl@iPtcAqe@ps@wqFvtC}_BrS_bBeRoaChSyxBtrAk`ArSkfC{Aq`D|Ya{CI|P|bWwPqX$poly$,
   pg_temp.sample_at(3, '16:30'), 3, 'ISR dorms', 'carry_on', 'Can drop off anywhere along I-88.', 3.29, 34,
   false, null, null, false, 'terminal', null, 0, null, null,
   '5', array['front', 'back_left', 'back_right']),
  -- 3. Illini Union → Indianapolis (119.7 mi, ~2.1 h)
  ('00000000-5a3b-4e00-8002-000000000003', '00000000-5a3b-4e00-8000-000000000003', '00000000-5a3b-4e00-8001-000000000003', true, false,
   'Illini Union', '1401 W Green St, Urbana, IL', 40.10921, -88.22722, 'Indianapolis', 'Indianapolis, IN', 39.76909, -86.15802,
   119.7, 124, $poly$qyxsFjvnyOeHgmBgb@cIrBoiCc]soAfB}hl@gUscDeW{yc@lm@_gCh}AavDMiqGww@wlCkX_xXmUawFo@itSia@yhBfYemC}Da|I`_@meC]giLtN}bCfiBaoMzB{`Fdy@_jLlpBitNnxAwoF~jEoeGjcBsxDnzEe`QneDwfE|lA{rDfwBwuDdgC{jDjsA}gGtHwvKl|AaiD|d@weDtgC}pFzt@}}D|w@}hAzhA}}C~wB{b@tk@NgCkgDrRuCbSy|@sE}nGvRmOv@wvD|LP$poly$,
   pg_temp.sample_at(3, '15:00'), 3, 'Illini Union', 'backpack', null, 3.29, 35,
   false, null, null, false, 'terminal', null, 0, null, null,
   '5_cramped', array['front', 'back_left', 'back_right']),
  -- 4. PAR dorms → St. Louis (175.1 mi, ~3 h)
  ('00000000-5a3b-4e00-8002-000000000004', '00000000-5a3b-4e00-8000-000000000005', '00000000-5a3b-4e00-8001-000000000005', true, false,
   'PAR dorms', '906 W College Ct, Urbana, IL', 40.0998, -88.22065, 'St. Louis', 'St. Louis, MO', 38.62743, -90.19824,
   175.1, 177, $poly$s|vsF~qmyOhGhnAvUKBliAvxb@`sD|e@ni@pk@{cArq@}XxaUyE~_@dN`cCnlCxf@nRzjX~HbaEvqB||JbE|}Bzu@tyEqBb_@`Xd`HvhLp~PlmGtcAbPliChvB`gA~j@d_Gr_Bh|BfWp`CbhBnfGba@he@pr@`b@toE|`@jdAvh@p^tgDdu@dj@`c@zkG`dYfhN~|r@vFpkA}[~pWjs@rtAnfFrmSdYrh@jdA~s@fa@~mDngErzKxj@~tErdA`tDzfBxvMjlAhtD}Hr}BpSfpA`_Bh{BxmAdyDhfBtyDyB~xJnSlrG`Npi@xaAbjAf_@xtA`WfiEGzpDld@pdDzChmD`UrlCl\jt@|~Ctf@n\z\ra@njB~}@vzHplCxaDbTri@tkA`vGxGxnFflBdbD~x@pw@fi@lpCxhAdq@}d@|}CsXkHyDtV$poly$,
   pg_temp.sample_at(4, '12:00'), 3, 'PAR dorms', 'carry_on', 'Quick stop in Effingham for food.', 3.29, 33,
   false, null, null, false, 'terminal', null, 0, null, null,
   '5_cramped', array['front', 'back_left', 'back_right']),
  -- 5. Krannert Center → Union Station Chicago (135.8 mi, ~2.3 h)
  ('00000000-5a3b-4e00-8002-000000000005', '00000000-5a3b-4e00-8000-000000000007', '00000000-5a3b-4e00-8001-000000000007', true, false,
   'Krannert Center', '500 S Goodwin Ave, Urbana, IL', 40.10796, -88.2225, 'Union Station Chicago', '225 S Canal St, Chicago, IL 60606', 41.87865, -87.64048,
   135.8, 139, $poly$yqxsFvwmyOuErMoqBhAV|yAyaH|Cih@jZwsGk`GcaHquB{fHeFyuHkmFe_L_`E{eDiM{{GkdDefBgG}gDqhC{fHuHcd@oVuiAmyAwf@yR}kAe@qmA}Uu{DjDgeBcs@i{CtBclBmoBae@ySudFvAopAeu@gtFiCwfA{m@{cC{Juj@}\urAweB_aEukB_w@yeBcd@y_@evBaKokH{{B}wAqGaeJgkCyk@qdAwO}}CsWag@me@uX_~IpJuaCvw@g_@t}AuYtXqnGzHaeQmtGcvFcr@i`EksEucD{xB_jHwUc_GqyA{uMUyg@}[meJowMotH}Akz@cSu]ab@kbAs@eQiYmBsyB{Wi\ylI`Hwk@f^ufKJ_PjLwPz{@aYlNefDiO?aL$poly$,
   pg_temp.sample_at(4, '17:00'), 2, 'Krannert Center', 'backpack', 'Dropping off at Union Station, close to the Blue Line.', 3.29, 36,
   false, null, null, false, 'terminal', null, 0, null, null,
   '4', array['front', 'back_left']),
  -- 6. Illini Union → Midway International Airport (126.9 mi, ~2.2 h)
  ('00000000-5a3b-4e00-8002-000000000006', '00000000-5a3b-4e00-8000-000000000004', '00000000-5a3b-4e00-8001-000000000004', true, false,
   'Illini Union', '1401 W Green St, Urbana, IL', 40.10921, -88.22722, 'Midway International Airport', '5700 S Cicero Ave, Chicago, IL 60638', 41.78678, -87.75219,
   126.9, 131, $poly$qyxsFjvnyO{E`N}d@Ro@z\qaALDf^yaH|Cih@jZwsGk`GcaHquB{fHeFyuHkmFe_L_`E{eDiM{{GkdDefBgG}gDqhC{fHuHcd@oVuiAmyAwf@yR}kAe@qmA}Uu{DjDgeBcs@i{CtBclBmoBae@ySudFvAopAeu@gtFiCwfA{m@{cC{Juj@}\urAweB_aEukB_w@yeBcd@y_@evBaKokH{{B}wAqGaeJgkCyk@qdAiR}cDiZif@oe@}TuxI`LuaCvw@g_@t}AuYtXqnGzHaeQmtGcvFcr@i`EksE__DcwBefH}U}sFwwA}zDiEwTyOAak@q}HzBuk@rOalYv^mzL|B~AtgA$poly$,
   pg_temp.sample_at(5, '06:30'), 5, 'Illini Union', 'large', 'Early one! Parking off-site, shuttle to the terminal.', 3.29, 24,
   true, 'WN 2210', pg_temp.sample_at(5, '11:20'), false, 'offsite', 'Park Midway lot', 10, null, null,
   '8', array['front', 'middle_left', 'middle_right', 'back_left', 'back_right']),
  -- 7. Illini Union → Bloomington-Normal (54.2 mi, ~1 h)
  ('00000000-5a3b-4e00-8002-000000000007', '00000000-5a3b-4e00-8000-000000000010', '00000000-5a3b-4e00-8001-000000000010', true, false,
   'Illini Union', '1401 W Green St, Urbana, IL', 40.10921, -88.22722, 'Bloomington-Normal', 'Normal, IL', 40.5142, -88.99063,
   54.2, 62, $poly$qyxsFjvnyO{E`N}d@Ro@z\qaALH`|@}t@ZtClyAyVl|Ay`E|xFutCvqMoeAjnCipEnle@qeCbaEm_@`_DeeLpgPahPfzd@kcAdyAg`@jxD_tK|XiGkI}}@vAcAgP$poly$,
   pg_temp.sample_at(5, '10:00'), 3, 'Illini Union', 'backpack', null, 0.20, 4,
   false, null, null, false, 'terminal', null, 0, null, null,
   '5_cramped', array['front', 'back_left', 'back_right']),
  -- 8. ISR dorms → Peoria (91.4 mi, ~1.6 h)
  ('00000000-5a3b-4e00-8002-000000000008', '00000000-5a3b-4e00-8000-000000000006', '00000000-5a3b-4e00-8001-000000000006', true, false,
   'ISR dorms', '1010 W Illinois St, Urbana, IL', 40.11011, -88.22174, 'Peoria', 'Peoria, IL', 40.69365, -89.58899,
   91.4, 97, $poly${}xsFj{myOwBhJkhB~@ZvwBcu@h@zC~xAyVl|Ay`E|xFutCvqMoeAjnCipEnle@qeCbaEm_@`_DeeLpgPahPfzd@kcAdyA}a@flIwwD`iB}uA{OwdH_EuRkDgK}WwMvBwQjp@_RjkHa}AddDqxCtzEiw@bz@iyAveDo]pnByChpFwjAzmGhHxch@e{D`|L{dDl_C_`Bfg@oIdGrG~L$poly$,
   pg_temp.sample_at(6, '14:00'), 3, 'ISR dorms', 'carry_on', 'Heading home for the weekend.', 3.29, 20,
   false, null, null, false, 'terminal', null, 0, null, null,
   '5', array['front', 'back_left', 'back_right']),
  -- 9. Illini Union → Evanston (147.7 mi, ~2.5 h)
  ('00000000-5a3b-4e00-8002-000000000009', '00000000-5a3b-4e00-8000-000000000009', '00000000-5a3b-4e00-8001-000000000009', true, false,
   'Illini Union', '1401 W Green St, Urbana, IL', 40.10921, -88.22722, 'Evanston', 'Evanston, IL', 42.04514, -87.68769,
   147.7, 151, $poly$qyxsFjvnyO{E`N}d@Ro@z\qaALDf^yaH|Cih@jZwsGk`GcaHquB{fHeFyuHkmFe_L_`E{eDiM{{GkdDefBgG}gDqhC{fHuHcd@oVuiAmyAwf@yR}kAe@qmA}Uu{DjDgeBcs@i{CtBclBmoBae@ySudFvAopAeu@gtFiCwfA{m@{cC{Juj@}\urAweB_aEukB_w@yeBcd@y_@evBaKokH{{B}wAqGaeJgkCyk@qdAwO}}CsWag@me@uX_~IpJuaCvw@g_@t}AuYtXqnGzHaeQmtGcvFcr@i`EksEucD{xB_jHwUc_GqyA{uMUyg@}[meJowMotH}Akz@cSu]ab@kbAs@eQiYmBsyB{Wi\ylI`Hwk@f^oiKZm^~gAiUhNw_F~Guz@riAq`ArRw|@`o@ya@tt@a{@~@}k@r|@gqRjMod@UhB_N$poly$,
   pg_temp.sample_at(6, '09:00'), 2, 'Illini Union', 'backpack', 'Visiting friends at Northwestern.', 3.99, 24,
   false, null, null, false, 'terminal', null, 0, null, null,
   '4', array['front', 'back_left']),
  -- 10. Krannert Center → Woodfield Mall (155 mi, ~2.6 h)
  ('00000000-5a3b-4e00-8002-000000000010', '00000000-5a3b-4e00-8000-000000000001', '00000000-5a3b-4e00-8001-000000000001', true, false,
   'Krannert Center', '500 S Goodwin Ave, Urbana, IL', 40.10796, -88.2225, 'Woodfield Mall', '5 Woodfield Mall, Schaumburg, IL 60173', 42.04717, -88.03674,
   155, 158, $poly$yqxsFvwmyOuErMoqBhAV|yAyaH|Cih@jZwsGk`GcaHquB{fHeFyuHkmFe_L_`E{eDiM{{GkdDefBgG}gDqhC{fHuHcd@oVuiAmyAwf@yR}kAe@qmA}Uu{DjDgeBcs@i{CtBclBmoBae@ySudFvAopAeu@gtFiCwfA{m@wiCkMoxBeaC_aEukB_w@yeBcd@y_@evBaKokH{{B}wAqGaeJgkCyk@qdAwO}}Csy@c_Ay}IxGifCzx@g_@t}AuYtXytGhGy~P{rGcvFcr@i`EksEkaDaxBilHqVc_GqyAw{M}Amz@iy@yrEoeHmvAb{@oMx`BqV`c@gaCboAqrB|jG{j@lk@mtBxp@syAzlBejAhk@mr@vdAwu@vnB{El}Am~Aj{Fwd@xq@ic@dNgoCpDwwDf{@}~DlHkoAkQ}aApUaiCpC}Y|Xiw@ptBar@pr@u]rjCmmAntAijBteFofEcIstDrn@g}DgQAvb@jRdR$poly$,
   pg_temp.sample_at(7, '11:00'), 3, 'Krannert Center', 'carry_on', null, 3.29, 34,
   false, null, null, false, 'terminal', null, 0, null, null,
   '5', array['front', 'back_left', 'back_right']),
  -- 11. O'Hare International Airport → Illini Union (148.7 mi, ~2.5 h)
  ('00000000-5a3b-4e00-8002-000000000011', '00000000-5a3b-4e00-8000-000000000002', '00000000-5a3b-4e00-8001-000000000002', true, false,
   'O''Hare International Airport', '10000 W O''Hare Ave, Chicago, IL 60666', 41.98026, -87.90899, 'Illini Union', '1401 W Green St, Urbana, IL', 40.10921, -88.22722,
   148.7, 152, $poly$oof_GbdpwOY`VvY`SyDlYzJhBbOsWtPXIgb@jg@bPxAsVxV{QrJlyDyNta@rhHj@_Mr]xq@wxBl^yZtfCE`gAkWteAlPhqBf@nvAmI`rDk{@dyCcGz`@iS~\}k@d~A}xFtDe{Ady@kvBnv@{fAjeA}f@~vAqjBrpBqn@vn@wm@f`Aq`C|SclArnMcV`Ioa@zaAzaA~v@rSnuLuGb_GtyAjnH~W|}CpwBv_EjrEvsF|p@ddQptGlrGyHpZe\r]ozA`fCox@|zI{Hp{@n_A|Oz~Cjm@`eAraJtiC`xAlGzlHn|BpyBtLrb@j`@`x@ffB~_EvjBvpAhdBbk@h]pcCtJ|dAtm@|wFbDzkAht@`fFuAzf@lTblBfoBh{CkBxbBlr@n_EyCblAvUxmAp@`g@jTlgAlwAnd@rV~dH`Hps@h]jnB~gB`lBvIp|GrdDdeD`Mf`Ll`E|vHzmF`cH~DxcHfvBlgGhlGjr@ah@fdHeDEg^paAMn@{\|d@SzEaN$poly$,
   pg_temp.sample_at(8, '20:00'), 3, 'O''Hare International Airport', 'large', 'Coming back from a trip, happy to grab anyone landing around 7.', 3.29, 40,
   false, null, null, false, 'terminal', null, 0, null, null,
   '5_cramped', array['front', 'back_left', 'back_right']),
  -- 12. Illini Union → Madison (255 mi, ~4.2 h)
  ('00000000-5a3b-4e00-8002-000000000012', '00000000-5a3b-4e00-8000-000000000010', '00000000-5a3b-4e00-8001-000000000010', true, false,
   'Illini Union', '1401 W Green St, Urbana, IL', 40.10921, -88.22722, 'Madison', 'Madison, WI', 43.07305, -89.40123,
   255, 253, $poly$qyxsFjvnyO{E`N}d@Ro@z\qaALH`|@}t@ZtClyAyVl|Ay`E|xFutCvqMoeAjnCipEnle@qeCbaEm_@`_DeeLpgPahPfzd@kcAdyA}a@flI_fDpdB}hL_T}d@gj@`UiiAyPk]usIkCk_BkW_fAhZejGzJmj@`b@o{@~iB_}DnIsn@|Zk``@bQ{]lX}VlkAo^fTwnZm@gxAl~@woGhDccA|o@icZjPg_AdQesH`NovHinC}qCaOk|JzDg}Bst@ekEgIieBjU{mAzk@ksGvRcxPmKwdDkeA_~CsdFik@uVgk_@xJspClgA{x@rIqcGhAcnBoU}qKhAk~AuJkcBrSy_WxGg\_Mcm@wx@ubAsPs`@k`DmwAydB_w@ef@gt@tVcmTy@stGn`CmoBrCc{Cdv@w{EHytAkY{fBs~AgmGl@_dA}|E_dAtRoE`tDozHpCaBdq@{b@|J}vMjGed@bUc_AvuA{l@hUmtJmBk`B~iB}vFtwA}mChxC}pD|oC_pCtKqzB|_AgrArXgcElgG_d@bbDnCfuC}pAfuFqjDtcG}x@fVvUdoEjJvhJaYhj@{rAxcAgl@yIma@hn@dC|u@$poly$,
   pg_temp.sample_at(9, '08:00'), 3, 'Illini Union', 'carry_on', 'Badgers game weekend.', 0.20, 4,
   false, null, null, false, 'terminal', null, 0, null, null,
   '5_cramped', array['front', 'back_left', 'back_right']),
  -- 13. Illini Union → Nashville (372 mi, ~6.1 h)
  ('00000000-5a3b-4e00-8002-000000000013', '00000000-5a3b-4e00-8000-000000000003', '00000000-5a3b-4e00-8001-000000000003', true, false,
   'Illini Union', '1401 W Green St, Urbana, IL', 40.10921, -88.22722, 'Nashville', 'Nashville, TN', 36.16266, -86.7816,
   372, 364, $poly$qyxsFjvnyOaEhiB|ze@v}D|e@ni@pk@{cArq@}XxaUyE~_@dN`cCnlCxf@nRzjX~HbaEvqB||JbE|}Bzu@h`F[x{Hp`Ml|P~kGtcAbPliChvB`gA~j@d_Gr_Bh|BfWp`CbhB`nGdf@t^rp@~h@zeFny@zeA`lDvw@~~@xm@xjE~Bl{Af]bjGnD|q@xStb@hi@fw@hxBndFnhEb}CdiE`pBb`EvbD`xDbvCvtEryBr`BjkBnmDxvBduB|rA~{Dvs@riA~fDjnCttIhlKnj@|[xwIjAv|Fcp@j{IKjuCm_@ppGdAvuE}z@juMi@fzCzf@~sAgPv{H}fCrd@}d@nk@m}Ah`@oXxkCsB~rBf_@xiCwj@jy@hIbnBpp@t}KuIl~CtiAv{HbL`cCfx@xwGfCvvB|aAj}Dq@niCa^x~In[heHZbzE`mApiCYjhBri@zvCvJ`jGzwAfnCbcB|[|A~xCwpErbNooK`w@wWnyI{dA`iDihBffEwpHfsC{rD|[eSxjA}NpzBqxCj~GygBdfCujCrsKsjFxyFeAxjE~~@`pEqeAvbBqcBnh@yaA`lAoz@`wDcrHlm@izD`|Ak{EwGqnEz`@muZoOmcCivBivBkf@}~BkpCaoD_cBu_Fml@qiEnQ{~Bs{A}aHb_@eoCeGa`Cf`@klB`SaeD`}BozDzuA_tAryDcwF|`G_ySfgBicCr}Ly`VjbBavAvcAy}Ch_BkgBr_AanBpYgaBfsBkmCdr@ouBheIajPbnCanB`mEkqNb{CmmErm@ewBr`AkvAt`Ao_DteIoaH|pColAphAux@hlCgpDxoHopOxoJ_mPxrBiqEbhBg|Bry@wjDnaD{cGpw@y{Bty@wuItm@c{@xb@eqAlsBac@zeBa~AduBax@ffBbCjjAo`A`aFtE|aB}m@|f@xuA|GwC$poly$,
   pg_temp.sample_at(10, '07:00'), 3, 'Illini Union', 'carry_on', 'One stop for lunch near Louisville.', 3.29, 35,
   false, null, null, false, 'terminal', null, 0, null, null,
   '5_cramped', array['front', 'back_left', 'back_right']),
  -- 14. Illini Union → Minneapolis (516.6 mi, ~8.4 h)
  ('00000000-5a3b-4e00-8002-000000000014', '00000000-5a3b-4e00-8000-000000000008', '00000000-5a3b-4e00-8001-000000000008', true, false,
   'Illini Union', '1401 W Green St, Urbana, IL', 40.10921, -88.22722, 'Minneapolis', 'Minneapolis, MN', 44.97775, -93.26501,
   516.6, 502, $poly$qyxsFjvnyO{E`N}d@Ro@z\qaALH`|@}t@ZtClyAyVl|Ay`E|xFutCvqMoeAjnCipEnle@qeCbaEm_@`_DeeLpgPahPfzd@kcAdyA}a@flIuhDreBgfLaU}d@gj@`UiiAyPk]usIkCk_BkW_fAhZejGzJmj@`b@o{@~iB_}DnIsn@|Zk``@bQ{]lX}VlkAo^fTwnZm@gxAl~@woGhDccA|o@icZjPg_AdQesH`NovHinC}qCaOk|JzDg}Bst@ekEgIieBjU{mAzk@ksGvRcxPmKwdDkeA_~CsdFik@uVgk_@xJspClgA{x@rIqcGhAcnBoU}qKhAk~AuJkcBrSy_WxGg\_Mcm@wx@ubAsPs`@k`DmwAydB_w@ef@gt@tVcmTy@stGn`CmoBrCc{Cdv@w{EHytAkY{fBs~AgmGl@_dA}|E_dAtRoE`tDozHpCaBdq@{b@|J}vMjGed@bUc_AvuA{l@hUmtJmBk`B~iB}vFtwA}mChxC}pD|oC_pCtKqzB|_AokArSqdEp~Fei@rmDfCrwCyjA|fF_|DjbHugCbCynD~s@m{AyQeiDpdA}bDp}Ak_BbbA}oB`uCiyAxsAs_EftAmoBtbAqqL`kLqpCxv@icDjGc~Avf@i{B`F{lGxyDunDuc@utAha@ez@v{BigA|u@eWzb@wwApnIigAl`HuSd_HmkB`hMqa@hcHiaCjaBysDk|@ohCrw@u}AeFk]dOsmDzaFauK~~T{oD~aOszEr}EoyCpmBwjDhuDqdCpeGk}BjlNuhE~fMghB|nJwyE~_Q_sBnfCay@pfBsgEpa@wvEl}AcpFzHacC`zBs\bvAkq@hlAcbEvnLwaAt_BkvBzsFcpAhdBaw@phD}vBppEa~@fpC{tArtAceBteCacAviF_fAbeBupA|`DglAxuEk~CfjFyv@rnBebArz@stArrD}sAdjBolCxtB}o@`|@g`Bpr@}t@l~AykBf{@{zCxhCoiCd{Ae|A~vB{}@plB_rEjlDiqAxxCac@ztCmuAfjDqbEbdB{sClrBkqChiA_jEn{EwhB`nDlF~sN{UleBmmAd`E}gHv`FklA~uCwrCnrOuwEnqMeUhkE}GnwNuR~}BxAlkKepAltJhMj}DsHz~B|OvbAMtsAiZzxDgv@v{BsPvyBcNj_]kUv~FvHtrBmRraB}N~fNtGnfIsoBb_GaDp~G_Z|bIfPftTbgAtxF|KrjB~@hr^qYjsH|BruD{Rzm@jQxz@_Lnl@nVpw@iGj|Mqr@drCO`p@ei@nbAtOzbAqBdvAq~@doCeOsR$poly$,
   pg_temp.sample_at(12, '06:00'), 3, 'Illini Union', 'large', 'Long one. We''ll stop every few hours.', 3.29, 29,
   false, null, null, false, 'terminal', null, 0, 'straight', null,
   '5', array['front', 'back_left', 'back_right']),
  -- 15. Illini Union → Hartford (954.7 mi, ~15.3 h)
  ('00000000-5a3b-4e00-8002-000000000015', '00000000-5a3b-4e00-8000-000000000004', '00000000-5a3b-4e00-8001-000000000004', true, false,
   'Illini Union', '1401 W Green St, Urbana, IL', 40.10921, -88.22722, 'Hartford', 'Hartford, CT', 41.7658, -72.67337,
   954.7, 919, $poly$qyxsFjvnyOeHgmBgb@cIrBoiCc]soAfB}hl@gUscDeW{yc@lm@_gCh}AavDMiqGww@wlCkX_xXmUawFo@itSia@yhBfYemC}Da|I`_@meC]giLtN}bCfiBaoMzB{`Frx@ofL~pBywNnxAwoF~jEoeGjcBsxDnzEe`QneDwfE|lA{rD|aGwgJzpAyaGtHwvKl|AaiD|d@weDtgC}pFzt@}}D|w@}hA~x@}fCtk@_[z@yj@bqAanD_GupItr@_mAMoh@wPqLfEuiCc}AqjDxAiuAa[ikAi]srDps@ilBw`@muNw_BitHeL}b`@}Wc_FuCatQcc@mzEclA}tEqCe}Eqr@svDPyvnAaf@k{EuDagKklAe_QfJ}eAxt@i}Bt|DulEhSiu@LmpKwi@wvEqPs}q@yOmeAoqA_sBmQa_AhQ_|HcEk{Ikv@mqGiPaeQwU{aB`^kdPpAskKs}Be}Hir@{}DrFopDcRcrFp[ihHpAmkKwX_eAczEctGaa@uuA|Ou~Koe@mbFkVafILcyLipAktJqr@khM_nBojKl^{nYnPilDfb@e{B{Eu}A|YckByv@sbBmNm_BvY}s@kGmi@o}AlOqpBsDubAr~@mqGdS{cAgw@i{CqT_kC{lAe`Gsa@orE_|Di_Akc@ocP_i@__AyNskAe}@k}JqrOoj@aSwfF}Uu|Aix@ipLw~ScfEonFwgC}eC_cCk|F{~EeqD__CgfCs{H{zDgwB_qDssCceCohA{uBcuBaoC{zE{cEobCagHwpD}_N_aCezD}pAsbGijCyjEmdAu_Eo{BstCafCk}GslEowE{g@m_AiWyzAwPuvFuzCowKyJwaAiXyc@kQewBbK_yRe`@ssCiz@ykA}E{fEbk@ijBaA{bMvJqoCp]cfCw`DGsLagCxAgcGoK}w@zO{pE_b@ohEalAufDsdA{}A}xAgrAkMog@cZclPvBsrGpZwlDGup^|d@ytDuAspFwV}yByQavOsZslIehAinEaGunEch@us@ahBu}El@}`EgcAkpBg@_yE_eByiHqKaoF}p@k|BlYasBF_~AmUiyBfHmaMoT{qIvc@erCmVorAcMkaDhG{w@if@oaByPgnBBcdEcXikGjPilHol@k~CjKowAcL{xNbJk~GyRylBpu@}fG|c@ctAOwwAge@moC{Ak|ArXwtAjc@oy@pgAgnGb`@iwGqH}[sq@_q@a~@_hG_u@osBjHgy@vx@{kBeCsi@qg@{mAeC_r@~Kit@tr@c|AlOwmDyJea@u`As`Aqb@w~B`WiaA|AuuFt|@qeEtCa|Bpm@{rAxHcdCwRatAc@kwEri@ktBQk`BaUsjB}aAu|AyRanCt]wnCeLwtBl_A{cInd@_oBnQsbDgOunArQojCsN{jDhu@wbAdwAeo@reAgbDicBceGpR{yMcw@_`DtmAacGfAyrDfnCmuMjLalHe`@eyJzg@mhC~jC}`DtmDqvFtBupAvgAyuEniB_`D]mhBbPudAjpAq`BnE{oBnr@upCfG{mFdhBwdCbOsg@eP{_Fj_A_pEqCycFhb@mtA`LumAx}A_hB|Mqi@so@_yCeDsjAo^yaAqAcrAglAgsAm_C}nKewA}_CyKmcEd~@ugElqByjDll@s~Epj@coBjcBwiAvx@qhA|LwlDh_Ac|BsMudCcfB}dG}h@_eD}_Bu|BoiAsu@m|BunDk{@mqDm]srF{n@ijClIm}AkUewAweAgsCabAqpAcc@_pBdJuk@dh@ap@wCsbDjgAe`ChQ_pB{fBmnTx|@ugA|PonClA}lEtt@av@zH{^srAmfHaeAcgB_x@k{FeAujMaNsnDlkAs`EneAktBlJuvEhp@wzDjpBu}AjmAijBpaAe}Dz|@unAxf@ehCcY{iJet@crCyVmrGpGobBoe@cbD`GsuBuTu_EksAyfFg_@}wDpSq~CgxAy_IjWmwBvwCoqG}ModBd[gdBs@e{Bw`A_dL`Qqd@jcAi]`Jwe@sNqsBat@u}A{PamAuj@oeAiJogC{m@{mByiAkqHej@ie@as@gcBgz@gg@so@obB_`@mY{oCaPerFvNarAum@az@iHuSom@}`@uYes@ufCcx@e]kuA}vBsOyo@waBc_Boj@eyC}fAaaDsgAwUgjA}cA}o@ynA{pEemE_UyvAwc@_~@g}A_EyrB}uAcYwfBcpAm~ByWaeB{}@yn@gr@a_A{\aiAys@ev@ca@eqAys@e~@nH_[ti@gYjlAw{AhlAwKxhAk^hLiRyEke@upC}pDqy@cxCaCcr@nmBclGr~BklBtZ}rA|j@}t@l}@mwD{g@qbB`FykDf{@s`ClUwtD}h@uuBNauAmZajAsAixBoy@uiDzFciFiq@_uFteAmeGeGwyGvb@_rAdd@_jFab@qcClHgtCxq@spElK{eGxm@ioCqp@ouB~@wkAoc@uwDja@q_BevBo~Ltb@_gDe^srA}zAa|CeC}dDci@_wAaKmuBei@cfAmi@k~B}CaqBq|@irDnRm|Dam@q`FklAowEepAupBu`Ao}@wiByvDc`@c}CklAmsDy{AebD_`@a}D{{AinFc@eiCb\{{B^y_BeJanAut@i~Bzk@udCtJwyD}c@{tBwHg~BnPuvF_~@ylBcI_m@bA{wCnk@evBcRycDvEcyAgq@ymDrJo}DwnBw_LxHsbBdQgg@fvDe{DjbA}`@va@i}@ns@ca@th@ct@f}F{hC|zA_VrjAa{@dyAkjBrbAe]nn@e|BeNknCum@yaDrx@{xGgPio@gp@zJyUmMc^wiAis@weAuh@moDxWcxAe_A}wDlIooBaSgaAaD}_D}O_cAliAs}CrQgnCsyB_{BwdAvNya@}Ie{As}Cc_Awy@emBowHo`Bo|CcsAw{GcUoV}fAwRcaA_mBgUeyAXu`C``AshAzQchBgc@ixBhm@ecCw[kv@{Hez@_eAwtAml@g`B_wB}aBa`@wFk`A~ZisAoOcs@{e@oqBm`D}jEkwCvAytBkJ_VslB}g@gmEmfCqa@k|AiFy}Bac@qg@}SoeAc_@{^ak@mLgEmkDgVe[ki@yGgTm]iZolAhLew@$poly$,
   pg_temp.sample_at(13, '08:00'), 4, 'Illini Union', 'large', 'Heading to Connecticut for break. Can drop off anywhere along I-80 / I-84.', 3.29, 24,
   false, null, null, false, 'terminal', null, 0, 'overnight', 'Youngstown, OH',
   '8', array['front', 'middle_left', 'middle_right', 'back_left']),
  -- 16. Illini Union → Union Station Chicago (135.5 mi, ~2.3 h)
  ('00000000-5a3b-4e00-8002-000000000016', '00000000-5a3b-4e00-8000-000000000011', '00000000-5a3b-4e00-8001-000000000011', false, true,
   'Illini Union', '1401 W Green St, Urbana, IL', 40.10921, -88.22722, 'Union Station Chicago', '225 S Canal St, Chicago, IL 60606', 41.87865, -87.64048,
   135.5, 139, $poly$qyxsFjvnyO{E`N}d@Ro@z\qaALDf^yaH|Cih@jZwsGk`GcaHquB{fHeFyuHkmFe_L_`E{eDiM{{GkdDefBgG}gDqhC{fHuHcd@oVuiAmyAwf@yR}kAe@qmA}Uu{DjDgeBcs@i{CtBclBmoBae@ySudFvAopAeu@gtFiCwfA{m@{cC{Juj@}\urAweB_aEukB_w@yeBcd@y_@evBaKokH{{B}wAqGaeJgkCyk@qdAwO}}CsWag@me@uX_~IpJuaCvw@g_@t}AuYtXqnGzHaeQmtGcvFcr@i`EksEucD{xB_jHwUc_GqyA{uMUyg@}[meJowMotH}Akz@cSu]ab@kbAs@eQiYmBsyB{Wi\ylI`Hwk@f^ufKJ_PjLwPz{@aYlNefDiO?aL$poly$,
   pg_temp.sample_at(3, '15:00'), 4, 'Illini Union', 'carry_on', 'Practice ride: tap a seat to request it. You get approved right away so you can see the whole flow. Nobody is really driving.', 3.29, 33,
   false, null, null, false, 'terminal', null, 0, null, null,
   '5_cramped', array['front', 'back_left', 'back_middle', 'back_right']);

-- A few made-up riders already have seats, so the seat maps show taken seats.
insert into public.trip_requests (trip_id, rider_id, status, seat, decided_at) values
  ('00000000-5a3b-4e00-8002-000000000001', '00000000-5a3b-4e00-8000-000000000003', 'approved', 'front', now()),
  ('00000000-5a3b-4e00-8002-000000000003', '00000000-5a3b-4e00-8000-000000000007', 'approved', 'back_left', now()),
  ('00000000-5a3b-4e00-8002-000000000006', '00000000-5a3b-4e00-8000-000000000009', 'approved', 'middle_left', now()),
  ('00000000-5a3b-4e00-8002-000000000006', '00000000-5a3b-4e00-8000-000000000001', 'approved', 'back_right', now()),
  ('00000000-5a3b-4e00-8002-000000000013', '00000000-5a3b-4e00-8000-000000000010', 'approved', 'front', now()),
  ('00000000-5a3b-4e00-8002-000000000015', '00000000-5a3b-4e00-8000-000000000008', 'approved', 'back_left', now()),
  ('00000000-5a3b-4e00-8002-000000000015', '00000000-5a3b-4e00-8000-000000000006', 'approved', 'middle_right', now()),
  ('00000000-5a3b-4e00-8002-000000000016', '00000000-5a3b-4e00-8000-000000000001', 'approved', 'back_left', now());
update public.trips t
set seats_booked = (select count(*) from public.trip_requests r where r.trip_id = t.id and r.status = 'approved')
where t.is_sample or t.is_practice;

select count(*) filter (where is_sample) as sample_trips, count(*) filter (where is_practice) as practice_rides
from public.trips where is_sample or is_practice;
