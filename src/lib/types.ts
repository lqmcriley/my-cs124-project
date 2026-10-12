// TypeScript shapes for rows in our database tables.
// Keep these in sync with supabase/migrations/.

import { CarBodyType, CLASS_YEARS } from './config';
import type { Fuel } from './fuel';
import type { SeatLayout } from './seats';
import type { VibeKey } from './vibes';

export type ClassYear = (typeof CLASS_YEARS)[number];
export type ChatPreference = 'quiet' | 'talk';

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  year: ClassYear | null;
  major: string | null;
  bio: string | null;
  chat_preference: ChatPreference;
} & Partial<Record<VibeKey, number>>; // vibe check sliders (0–4)

export type Car = {
  id: string;
  owner_id: string;
  make: string;
  model: string;
  color: string;
  plate: string;
  mpg: number;
  seats: number;
  body_type?: CarBodyType; // drawing shape; optional for databases before the body-style migration
  seat_layout?: SeatLayout; // optional for databases before the seat-map migration
  model_year?: number | null; // e.g. 2019 (null for cars saved before it was asked)
  fuel?: Fuel; // electric cars store miles per kWh in `mpg`
};

export type TripStatus = 'scheduled' | 'cancelled' | 'completed';
export type Luggage = 'none' | 'backpack' | 'carry_on' | 'large';

export type Trip = {
  id: string;
  driver_id: string;
  car_id: string | null;
  origin_name: string;
  origin_address: string;
  origin_lat: number;
  origin_lng: number;
  dest_name: string;
  dest_address: string;
  dest_lat: number;
  dest_lng: number;
  route_miles: number;
  route_minutes: number | null;
  route_polyline: string | null;
  departure_at: string; // ISO date string from the database
  flex_minutes: number;
  seats_offered: number;
  pickup_spot: string;
  luggage: Luggage;
  notes: string | null;
  gas_price: number;
  mpg: number;
  status: TripStatus;
  // Airport trips
  is_airport: boolean;
  flight_number: string | null;
  flight_departs_at: string | null;
  flight_international: boolean;
  parking: 'terminal' | 'offsite';
  parking_location: string | null;
  shuttle_minutes: number;
  seats_booked: number; // approved riders, kept up to date by the database
  late_cancel_count: number; // riders who cancelled within 24 hours (they still owe their share)
  cancelled_at: string | null;
  driver_late_cancel: boolean;
  // Long trips (8+ hours): straight through or overnight. Optional for older databases.
  long_trip_plan?: 'straight' | 'overnight' | null;
  overnight_stop?: string | null;
  // Made-up demo trips (supabase/seed/sample_trips.sql). Nobody can request them.
  is_sample?: boolean;
  // The practice ride anyone can join to try booking (requests are approved instantly).
  is_practice?: boolean;
  // Seat map: the car's layout and which seats the driver offers. Null on trips posted before seat maps.
  seat_layout?: SeatLayout | null;
  open_seats?: string[] | null;
  // Copied from the car when posted. Electric trips store mi/kWh in `mpg` and $/kWh in `gas_price`.
  fuel?: Fuel;
};

// A trip plus the driver's public profile and car, as loaded for cards and the detail screen.
export type TripWithDriver = Trip & {
  driver: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'year' | 'major' | 'bio' | 'chat_preference' | VibeKey>;
  car: Pick<Car, 'make' | 'model' | 'color' | 'plate' | 'seats' | 'body_type'> | null;
};

export type RequestStatus = 'pending' | 'approved' | 'declined' | 'cancelled';

export type TripRequest = {
  id: string;
  trip_id: string;
  rider_id: string;
  status: RequestStatus;
  rider_miles: number | null; // null = riding the whole way
  dropoff_name: string | null;
  dropoff_address: string | null;
  message: string | null;
  parking_acknowledged: boolean;
  decided_at: string | null;
  created_at: string;
  paid_at: string | null; // set by the driver with "Mark paid"
  cancelled_at: string | null;
  late_cancel: boolean; // cancelled an approved seat within 24 hours
  no_show: boolean; // driver reported this rider didn't come
  driver_no_show: boolean; // this rider reported the driver didn't come
  seat?: string | null; // seat picked on the seat map (null on trips without one)
};

// A request plus the rider's public profile (what the driver sees).
export type RequestWithRider = TripRequest & {
  rider: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'year' | 'major' | 'chat_preference' | VibeKey>;
};

// A request plus its trip (what the rider sees in My trips).
export type RequestWithTrip = TripRequest & { trip: TripWithDriver };

export type TripRider = { rider_id: string; first_name: string; avatar_url: string | null };

export type Message = {
  id: string;
  trip_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type Review = {
  id: string;
  trip_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number; // 1–5
  comment: string | null;
  created_at: string;
};

export type ReportReason = 'unsafe_driving' | 'harassment' | 'no_show' | 'payment' | 'fake_profile' | 'other';
