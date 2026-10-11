> **Name change (Oct 11, 2026):** the app is now called **Hitch Illini**. The original spec below says "Halfsies".

I want to build a mobile app called **Halfsies**: a carpool app for University of Illinois Urbana-Champaign (UIUC) students. Drivers post trips they're already taking, and riders book a seat and split the gas cost. It is cost-sharing, not a taxi service. Drivers should never make a profit.

I'm a beginner, so explain what you're doing as you go, keep the code simple, and build it in the phases below. Finish and test one phase before starting the next, and stop at the end of each phase so I can try it.

Before writing code, save this whole spec to `SPEC.md` and create a `CLAUDE.md` that summarizes the stack, folder structure, and how to run the app.

## Tech stack

- **Expo (React Native) with TypeScript** so it runs on iPhone and Android, and I can test with the Expo Go app.
- **Supabase** for login, database (Postgres), photo storage, and real-time chat.
- **Maps:** `react-native-maps` for display, and the Google Maps Directions + Places APIs for address search and route distance. Keep API keys in a `.env` file and never commit it.
- **Payments (MVP):** no in-app card processing yet. The app calculates what each rider owes and shows a "Pay with Venmo" button that deep-links to Venmo with the amount and note filled in. The driver marks each rider as paid.

## Core rules

- **UIUC only:** sign up with an `@illinois.edu` email using a Supabase one-time code. Reject any other email domain.
- **Fair-price formula:** trip cost = (route miles ÷ car MPG) × gas price per gallon. Divide that by the number of people in the car, including the driver. Each rider pays one share; the driver pays their own share.
  - Gas price is entered by the driver, defaulting to a value I can set in one config file.
  - Riders getting dropped off partway pay proportionally to the miles they ride.
  - Hard cap: a rider's share can never exceed (their miles × the IRS mileage rate ÷ people in car). Put the IRS rate in config too.
- **Odometer photos (optional):** the driver can upload a start and end odometer photo to the trip as a trust record. The price is always based on the route distance, not the photos.

## Screens

1. **Welcome / Sign in:** logo, tagline "Split the ride. Split the gas.", email field, 6-digit code entry.
2. **Profile setup:** name, photo, year/major (optional), short bio, music/chat preference ("quiet ride" / "down to talk"). Drivers also add their car: make, model, color, plate, MPG, and seats.
3. **Home (find a ride):** search "From" and "To" with address autocomplete, plus a date picker. Quick-pick chips for common UIUC trips: Chicago (Loop), O'Hare, Midway, Chicago suburbs, Indianapolis, St. Louis, Peoria/Bloomington. Show results as cards with driver photo, rating, departure time, seats left, price per seat, and pickup spot. Include a map toggle.
4. **Post a trip (driver):** start and end on a map, date/time, flexible window (±30 min / ±1 hr / ±2 hr), seats offered, pickup spot (suggest Illini Union, Krannert Center, and the ISR/PAR dorm areas), luggage space, and notes. Show a live price-per-seat preview using the formula.
5. **Trip detail:** route on the map, driver profile and car, riders already booked (first name and photo), price breakdown, and a "Request seat" button.
6. **Requests:** the driver approves or declines each rider request. Riders see pending, approved, and declined status.
7. **Chat:** one group chat per trip, opened only after approval, using Supabase realtime.
8. **My trips:** upcoming and past, as driver and as rider. Includes cancel trip, odometer photo upload (driver), "Pay with Venmo" (rider), and "Mark paid" (driver).
9. **Rate & review:** after a trip, 1–5 stars and an optional comment for each person in the car.
10. **Safety:** share live trip details with a friend via text link, a report-user button, block user, and an emergency button that dials 911.

## Database (Supabase)

Tables: `profiles`, `cars`, `trips`, `trip_requests`, `messages`, `reviews`, `reports`, `odometer_photos`. Turn on Row Level Security for every table so users can only edit their own data, and only approved riders and the driver can read a trip's chat. Write the SQL as migration files in `supabase/migrations/`.

## Build phases

1. **Setup:** Expo project, Supabase connection, `@illinois.edu` login, profile setup. Tell me exactly which accounts and keys I need to create, with step-by-step instructions.
2. **Trips:** post a trip with map + address search, price calculator, browse/search trips, trip detail.
3. **Booking:** request → approve/decline flow, My Trips screen, cancellations.
4. **Chat & payments:** trip group chat, Venmo deep link, mark-paid tracking.
5. **Trust & safety:** reviews, odometer photos, report/block, share-trip link.
6. **Polish:** app icon, empty states, loading states, error messages, and seed data with ~15 fake UIUC trips so the app doesn't look empty in demos.

## Design

Clean and friendly, not corporate. Primary color: a warm orange (#FF6B35) with deep navy (#13294B) for text and headers. Rounded cards, big tap targets, and the price-per-seat always visible and bold. Must work in light and dark mode.

## Out of scope for now

In-app card payments, background GPS tracking, government ID verification, other schools, and a web version. Add a `ROADMAP.md` listing these as future work.
