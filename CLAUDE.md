# Hitch Illini — notes for Claude

Hitch Illini is a carpool app for UIUC students. Drivers post trips they're already taking, and riders book a seat and split the gas cost. It is **cost-sharing only**, so drivers never profit. Full requirements: `SPEC.md`. Out of scope: `ROADMAP.md`. Account and key setup: `SETUP.md`. Expo-specific agent rules: `AGENTS.md` (read it: always check the versioned Expo docs, and use `npx expo install`).

The owner is a beginner. Keep code simple, explain changes in plain language, and build one phase at a time (see `SPEC.md` → Build phases). Stop after each phase so the owner can test it.

## Collaboration style: Conversational

- Talk like a friendly teammate: plain language, no jargon without a quick explanation.
- Before a big step, say in a sentence or two what you're about to do and why. After it, say what changed and what the owner should try.
- When a choice affects how the app looks, works or costs money, ask the owner instead of deciding silently. Offer a recommendation.
- Give step-by-step instructions (numbered, with exact button names) for anything the owner has to do in Supabase, Google Cloud, Expo or on their phone.
- Keep replies short and skimmable. Check in rather than dumping everything at once.

**Status:** Phases 1–4 + reliability built and partly tested by the owner. Phase 5 (reviews, odometer photos, report/block, share trip, 911, private phone numbers shared after approval) built, awaiting owner testing. Phase 6 (polish + sample trips) built, awaiting owner testing. All spec phases are done; future ideas live in `ROADMAP.md`. "Along the way" search built (owner's idea): trips whose route passes within 12 mi of a searched destination show up with the price for the rider's part, and the stop carries through to Request a seat.

**Pricing decision (owner's choice):** riders pay based on how many people actually ride. Trips show the price "if you join now" (booked riders + you), "as low as" (full car), and a per-rider-count table. What each rider owes after departure uses `splitGasByRide()` (owner's choice): the route is cut into stretches at each drop-off and each stretch's gas is split between whoever is in the car (driver included), with the IRS cap per stretch. Riders get everyone's distances (no names) via the `trip_split()` SQL function. Pre-departure prices are labeled "about". See `src/lib/pricing.ts`.

**Other owner decisions:** drivers can edit seats (up to car seats) and airport/parking details after posting, but not route, pickup or gas price. Airport trips store the driver's flight + parking (terminal or off-site + shuttle) and suggest a leave time (`src/lib/airport.ts`). Payment handles (Venmo/Cash App/PayPal) live in the private `payment_methods` table; only the owner can read them until Phase 4 opens them to approved riders. Tab bar is `NativeTabs` (Liquid Glass on iOS 26). No emojis in the UI; use Ionicons.

## Stack

- **Expo SDK 57 (React Native 0.86) + TypeScript**, with **Expo Router** (file-based screens in `src/app/`). Testing is done in **Expo Go**, so only use libraries Expo Go includes.
- **Supabase**: email one-time-code auth (`@illinois.edu` only), Postgres with Row Level Security on every table, Storage for photos, and Realtime for chat (Phase 4).
- **Maps** (Phase 2): `react-native-maps`, plus Google **Places API (New)** and **Routes API**. Routes replaces the legacy Directions API, which new Google projects can't enable.
- **Payments**: no card processing. A "Pay with Venmo" deep link, and the driver marks riders as paid.

## Folder structure

```
src/
  app/                      Screens (each file is a route)
    _layout.tsx             Root: AuthProvider + Stack.Protected guards (sign-in / profile-setup / tabs)
    sign-in.tsx             Welcome + email + 6-digit code
    profile-setup.tsx       First-time profile (uses ProfileForm)
    edit-profile.tsx        Modal, same ProfileForm
    (tabs)/_layout.tsx      Bottom tabs
    (tabs)/index.tsx        Home / Find a ride (search, quick picks, list/map)
    (tabs)/post.tsx         Post a trip (live route + price preview)
    trip/[id].tsx           Trip detail
    edit-trip/[id].tsx      Edit trip (driver)
    request-seat/[id].tsx   Request a seat (rider; drop-off, note, parking OK)
    (tabs)/my-trips.tsx     My trips: needs-your-answer, upcoming/past, driving/riding
    chat/[id].tsx           Trip group chat (driver + approved riders, live via Realtime)
    (tabs)/profile.tsx      Your profile, car, sign out
  components/
    ui.tsx                  Screen, Heading, Body, Label, Button, TextField, Chip, Card, ErrorText
    profile-form.tsx        Profile + car form
    place-search-field.tsx  Google address autocomplete
    route-map.tsx, trips-map.tsx, trip-card.tsx, price-breakdown.tsx, date-time-field.tsx
    avatar.tsx, logo.tsx
  constants/theme.ts        Light/dark colors, spacing, radius, TapTarget
  hooks/use-theme.ts        Current color palette
  lib/
    config.ts               ⭐ Tweakable constants: DEFAULT_GAS_PRICE, IRS_MILEAGE_RATE, email domain, limits
    supabase.ts             Supabase client (reads EXPO_PUBLIC_* from .env)
    secure-storage.ts       Encrypted session storage (SecureStore key + AsyncStorage)
    email.ts                @illinois.edu check
    profile-form.ts         Form validation + conversion to DB rows (pure, tested)
    profile-api.ts          Save profile/car, upload avatar
    pricing.ts              ⭐ Fair-price formula (tested)
    maps.ts                 Google Places (New) + Routes API calls
    geo.ts, format.ts       Distance, polyline decoding, text formatting
    trip-form.ts, trip-search.ts, trips-api.ts   Post/edit-trip rules, search filter, Supabase queries
    airport.ts              Leave-time + terminal-arrival math (tested)
    booking.ts, booking-api.ts   Booking rules (tested) + calls to request_seat / respond_to_request / cancel_request / trip_riders
    payments.ts             Payment handle cleanup/validation + pay links (tested)
    chat-api.ts             Load/send chat messages + live subscription
    fuel.ts                 Fuel types, electric (mi/kWh, $/kWh) words + limits, carName() (tested)
    seats.ts                Seat layouts, offered seats, seat states (tested)
    errors.ts               friendlyError(): technical errors -> plain sentences (tested)
    types.ts                Row types; keep in sync with migrations
    __tests__/              Jest unit tests for the pure lib files
  providers/auth-provider.tsx   session, profile, car, loading, refreshProfile, signOut
supabase/migrations/        SQL, one file per phase; run in filename order
supabase/seed/              Sample trips for demos (add / remove), pasted into the SQL Editor
supabase/tests/             Database tests (stubs.sql fakes Supabase's auth/storage; *.test.sql print PASS lines)
scripts/test-db.sh          Runs all migrations + database tests on a throwaway local Postgres
```

## Rules to never break

- Reliability (owner's choice): cancelling an approved seat <24h before departure = late cancel; the seat reopens but the rider still owes (`payingRiders()` = approved + late cancellers), so others' price never rises. Drivers cancelling <24h with riders = late cancel. No-shows reportable for 7 days after departure. Totals via the `reliability()` SQL function; labels in `lib/reliability.ts`.
- A car MPG change updates that driver's upcoming trips only while nobody is booked (trigger `cars_sync_trip_mpg`).
- UI conventions (owner's choices): pill-shaped buttons that shrink-and-spring on press (`PressableScale` in `components/motion.tsx`); full-width `SegmentedControl` for 2–7 short options (chips only for long lists); pill search bar in `place-search-field.tsx`; tab bar never minimizes; Post/Edit trip use fold-out sections (`components/fold-section.tsx`, `trip-details-fields.tsx`); an illustrated car in the car's color and body style: sedan, hatchback, SUV, pickup, minivan, coupe (`components/car-illustration.tsx`, `lib/car-color.ts`), never a real photo.
- Vibe check: five 0–4 sliders on profiles (`lib/vibes.ts`, `components/vibes.tsx`): chat, music, temperature, windows, stops. `chat_preference` is kept in sync from the chat slider.
- Along the way: `searchTrips()` / `alongTheWay()` in `lib/trip-search.ts` use the stored route polyline (`closestPointOnRoute` in `lib/geo.ts`). Tested on a real UIUC→Hartford route in `lib/__fixtures__/`. Stops pass between screens as `stopName/stopAddress/stopLat/stopLng` link params.
- Phase 5: reviews are public, one per person per trip, 14-day window after departure, can't be edited. Reports are private (reporter + dashboard only). Blocks stop requests/approvals both ways (trigger on trip_requests) and hide trips via `blocked_user_ids()`. Odometer photos live in the private `odometer` bucket at `<trip id>/<start|end>`, viewed via signed URLs. Phone numbers live in private `contact_info` and are revealed only via `trip_contacts()` between a driver and approved riders.
- Phase 6 (owner's choices): app icon = the split-circle logo on light grey (`assets/images/`, drawn by a script, not a real photo). Sample trips are labeled "Sample" and can't be requested (`trips.is_sample`, trigger on trip_requests; the app can never set it). Add/refresh them with `supabase/seed/sample_trips.sql` (dates are relative to today, made-up drivers are banned from signing in), remove them all with `supabase/seed/remove_sample_trips.sql`. The same seed adds one practice ride (`trips.is_practice`, driver "Taylor Practice") anyone can join to try booking: a trigger approves its requests instantly. Neither flag can be set from the app.
- Seat maps (owner's choice): each car has a `seat_layout` ('2', '4', '5', '5_cramped', '7', '8'; `lib/seats.ts`, mirrored in SQL `layout_seats()`), and `cars.seats` always follows it (trigger). Drivers tap seats to offer on Post/Edit trip (`trips.open_seats`, count = `seats_offered`); riders must pick an open seat (`request_seat(..., p_seat)`). A pending request holds its seat; decline/cancel frees it; one person per seat (unique index). Drivers can't un-offer a held seat. Same price for every seat. `trip_seats()` shows who sits where (names only for approved riders, plus the driver and yourself). Trips without `seat_layout` (posted before) work as plain "a seat". Drawn by `components/seat-map.tsx`. Like a plane seat map, riders can tap an open seat right on the trip page; it opens Request a seat with that seat chosen (`seat` link param).
- Car year + fuel (owner's choice): cars have `model_year` and `fuel` (regular, premium, diesel, hybrid, electric; `lib/fuel.ts`). Premium is a label only; drivers set the gas price themselves. Electric cars store miles per kWh in `mpg` and their trips store $/kWh in `gas_price` (default $0.20), so the pricing math is unchanged; only the words change (`energy()`). Trips copy `fuel` from the car on insert (trigger). Show cars with `carName()` ("Silver 2019 Honda Civic").
- Screens use `components/states.tsx` for empty (`EmptyState`), failed (`LoadError` with Try again) and loading (`SkeletonList`) states. Show errors through `friendlyError()` in `lib/errors.ts`, never a raw `err.message`.
- Haptics on important actions (`lib/haptics.ts`) and subtle Reanimated motion (`components/motion.tsx`): owner chose haptics + smooth content, subtle, no springy taps.
- Start the app with `EXPO_UNSTABLE_TUNNEL_V2=1 npx expo start --tunnel` (Expo's ngrok tunnel is broken).
- Payments open only after departure, so the rider count is final: what a rider owes = `amountOwed()` in `lib/booking.ts`. Drivers mark paid via `set_request_paid`; driver handles reach riders only via `trip_payment_handles`.
- Booking writes go only through the security-definer SQL functions in the Phase 3 migration; `trip_requests` has no insert/update policies. `trips.seats_booked` is maintained by those functions (never writable by clients).

- The `@illinois.edu` check lives in **both** `lib/email.ts` and a database trigger on `auth.users`.
- Every table has RLS enabled with policies. Users write only their own rows. Never use the secret/service-role key in the app.
- Price per share = (miles ÷ MPG × gas price) ÷ people in the car (driver included). Partial riders pay in proportion to their miles. Cap: rider miles × IRS rate ÷ people. Constants come from `lib/config.ts`. Put the pricing math in a pure `lib/pricing.ts` with unit tests.
- Secrets go in `.env` (gitignored). Only `EXPO_PUBLIC_*` vars reach the app.
- Colors: orange `#FF6B35` primary, navy `#13294B` text and headers, navy text on orange buttons (for contrast). Always support dark mode via `useTheme()`. Tap targets are ≥ 44pt.

## How to run

```bash
npm install
cp .env.example .env        # fill in Supabase (+ Google from Phase 2) keys — see SETUP.md
npx expo start              # or --tunnel on campus Wi-Fi; scan the QR with Expo Go / Camera
```

Checks to run before calling a phase done:

```bash
npx tsc --noEmit            # type-check
npx expo lint               # lint
npm test                    # unit tests
npm run test:db             # database rules (needs: brew install postgresql@17)
```

Add a `supabase/tests/*.test.sql` check (using `test.ok`, `test.fails`, `test.as`) for every new database rule.

Database: paste each new file from `supabase/migrations/` into the Supabase SQL Editor (see SETUP.md 2c).
