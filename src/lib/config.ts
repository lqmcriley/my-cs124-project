// App-wide settings. Change a number here and the whole app picks it up.

// Only students with this email domain can sign up.
export const ALLOWED_EMAIL_DOMAIN = 'illinois.edu';

// Gas price (dollars per gallon) pre-filled when a driver posts a trip.
// Drivers can change it per trip. Update this when local prices move.
export const DEFAULT_GAS_PRICE = 3.49;

// IRS business mileage rate (dollars per mile). Used as a hard price cap so
// drivers can never charge more than this, split across everyone in the car.
// 76¢ is the rate for July–December 2026: https://www.irs.gov/tax-professionals/standard-mileage-rates
export const IRS_MILEAGE_RATE = 0.76;

// Profile options
export const CLASS_YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad'] as const;
export const BIO_MAX_LENGTH = 200;

// Car limits (also enforced in the database)
export const MIN_MPG = 5;
export const MAX_MPG = 150;
export const MAX_PASSENGER_SEATS = 7;

// Drivers can set a gas price within this range (also enforced in the database).
export const MIN_GAS_PRICE = 1;
export const MAX_GAS_PRICE = 10;

// ---------------------------------------------------------------------------
// Places. Coordinates come from Google Places (looked up October 2026).
// ---------------------------------------------------------------------------

export type Place = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isAirport?: boolean; // turns on the flight + parking section when posting
};

// Middle of campus, used to center maps and bias address search.
export const CAMPUS_CENTER = { latitude: 40.1092, longitude: -88.2272 };

// Suggested pickup spots when posting a trip.
export const PICKUP_SPOTS: Place[] = [
  { name: 'Illini Union', address: '1401 W Green St, Urbana, IL', latitude: 40.10921, longitude: -88.22722 },
  { name: 'Krannert Center', address: '500 S Goodwin Ave, Urbana, IL', latitude: 40.10796, longitude: -88.2225 },
  { name: 'ISR dorms', address: '1010 W Illinois St, Urbana, IL', latitude: 40.11011, longitude: -88.22174 },
  { name: 'PAR dorms', address: '906 W College Ct, Urbana, IL', latitude: 40.0998, longitude: -88.22065 },
];

// Quick-pick destinations. A trip "matches" if it ends within radiusMiles of the point.
export type QuickPick = Place & { radiusMiles: number };

export const QUICK_PICKS: QuickPick[] = [
  { name: 'Chicago (Loop)', address: 'Chicago Loop, Chicago, IL', latitude: 41.87829, longitude: -87.6244, radiusMiles: 4 },
  { name: "O'Hare", address: "O'Hare International Airport, Chicago, IL", latitude: 41.98026, longitude: -87.90899, radiusMiles: 4, isAirport: true },
  { name: 'Midway', address: 'Midway International Airport, Chicago, IL', latitude: 41.78678, longitude: -87.75219, radiusMiles: 4, isAirport: true },
  { name: 'Chicago suburbs', address: 'Naperville, IL', latitude: 41.75084, longitude: -88.15354, radiusMiles: 30 },
  { name: 'Indianapolis', address: 'Indianapolis, IN', latitude: 39.76909, longitude: -86.15802, radiusMiles: 15 },
  { name: 'St. Louis', address: 'St. Louis, MO', latitude: 38.62743, longitude: -90.19824, radiusMiles: 15 },
  { name: 'Peoria/Bloomington', address: 'Peoria & Bloomington-Normal, IL', latitude: 40.58, longitude: -89.29, radiusMiles: 30 },
];

// How close a trip's start/end must be to a searched address to show up.
export const SEARCH_RADIUS_MILES = 15;

// ---------------------------------------------------------------------------
// Trip options
// ---------------------------------------------------------------------------

export const FLEX_WINDOWS = [
  { minutes: 30, label: '±30 min' },
  { minutes: 60, label: '±1 hr' },
  { minutes: 120, label: '±2 hr' },
] as const;

export const LUGGAGE_OPTIONS = [
  { value: 'none', label: 'No luggage' },
  { value: 'backpack', label: 'Backpack' },
  { value: 'carry_on', label: 'Carry-on' },
  { value: 'large', label: 'Large suitcase' },
] as const;

export const TRIP_NOTES_MAX_LENGTH = 500;

// ---------------------------------------------------------------------------
// Airport trips
// ---------------------------------------------------------------------------

// How early to be at the terminal before a flight, in minutes.
export const AIRPORT_ARRIVAL_BUFFER_MINUTES = { domestic: 120, international: 180 } as const;

// Extra cushion for traffic when suggesting a leave time.
export const AIRPORT_TRAFFIC_BUFFER_MINUTES = 30;

export const SHUTTLE_MINUTE_OPTIONS = [10, 20, 30, 45] as const;
