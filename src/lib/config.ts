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
