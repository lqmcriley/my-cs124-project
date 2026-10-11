// TypeScript shapes for rows in our database tables.
// Keep these in sync with supabase/migrations/.

import { CLASS_YEARS } from './config';

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
};

export type Car = {
  id: string;
  owner_id: string;
  make: string;
  model: string;
  color: string;
  plate: string;
  mpg: number;
  seats: number;
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
};

// A trip plus the driver's public profile and car, as loaded for cards and the detail screen.
export type TripWithDriver = Trip & {
  driver: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'year' | 'major' | 'bio' | 'chat_preference'>;
  car: Pick<Car, 'make' | 'model' | 'color' | 'plate' | 'seats'> | null;
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
};

// A request plus the rider's public profile (what the driver sees).
export type RequestWithRider = TripRequest & {
  rider: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'year' | 'major' | 'chat_preference'>;
};

// A request plus its trip (what the rider sees in My trips).
export type RequestWithTrip = TripRequest & { trip: TripWithDriver };

export type TripRider = { rider_id: string; first_name: string; avatar_url: string | null };
