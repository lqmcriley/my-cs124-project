// The fair-price formula. Everything about money lives here, with tests in __tests__/pricing.test.ts.
//
//   trip gas cost = (miles ÷ MPG) × gas price
//   one share     = trip gas cost ÷ people in the car (driver included)
//
// Riders dropped off partway pay for only the miles they ride.
// Hard cap: a share can never be more than (rider miles × IRS rate ÷ people in car).
// Shares round DOWN to the cent, so the driver can never come out ahead.
//
// The price depends on how many people actually ride: fewer riders = bigger
// share each. Trips show the price "if you join now" and how low it can drop.

import { IRS_MILEAGE_RATE } from './config';

export type ShareInput = {
  riderMiles: number; // how far this rider rides
  mpg: number;
  gasPrice: number; // dollars per gallon
  peopleInCar: number; // riders + driver
};

// Round down to whole cents. The tiny 1e-9 avoids float errors like 12.999999 -> 12.99.
export function floorToCents(amount: number): number {
  return Math.floor(amount * 100 + 1e-9) / 100;
}

export function gasCost(miles: number, mpg: number, gasPrice: number): number {
  if (miles <= 0 || mpg <= 0 || gasPrice <= 0) return 0;
  return (miles / mpg) * gasPrice;
}

// What one rider owes.
export function riderShare({ riderMiles, mpg, gasPrice, peopleInCar }: ShareInput): number {
  if (peopleInCar < 2) return 0; // nobody to split with
  const fairShare = gasCost(riderMiles, mpg, gasPrice) / peopleInCar;
  const cap = (Math.max(riderMiles, 0) * IRS_MILEAGE_RATE) / peopleInCar;
  return floorToCents(Math.min(fairShare, cap));
}

type TripCostInput = { miles: number; mpg: number; gasPrice: number };

export type TripPrice = {
  miles: number;
  gallons: number;
  totalGasCost: number;
  riders: number;
  peopleInCar: number;
  perSeat: number; // what each rider pays with this many riders
  capped: boolean; // true if the IRS cap lowered the price
};

// Price per seat for a given number of riders (driver not counted in `riders`).
export function tripPrice({ miles, mpg, gasPrice, riders }: TripCostInput & { riders: number }): TripPrice {
  const peopleInCar = Math.max(riders, 1) + 1;
  const totalGasCost = gasCost(miles, mpg, gasPrice);
  const perSeat = riderShare({ riderMiles: miles, mpg, gasPrice, peopleInCar });
  return {
    miles,
    gallons: mpg > 0 ? miles / mpg : 0,
    totalGasCost,
    riders: peopleInCar - 1,
    peopleInCar,
    perSeat,
    capped: perSeat < floorToCents(totalGasCost / peopleInCar),
  };
}

// Price per seat for every possible number of riders, from 1 up to a full car.
export function priceTable(input: TripCostInput & { seatsOffered: number }): TripPrice[] {
  return Array.from({ length: Math.max(input.seatsOffered, 1) }, (_, i) => tripPrice({ ...input, riders: i + 1 }));
}

// What a trip card shows: the price if you join now, and the lowest it can go.
export function tripPriceSummary(input: TripCostInput & { seatsOffered: number; ridersBooked: number }) {
  const ifYouJoin = tripPrice({ ...input, riders: Math.min(input.ridersBooked + 1, input.seatsOffered) });
  const ifFull = tripPrice({ ...input, riders: input.seatsOffered });
  return { ifYouJoin, ifFull };
}

// ---------------------------------------------------------------------------
// Splitting gas fairly when riders get off at different places.
//
// The route is cut into stretches at each drop-off. Each stretch's gas is split
// between whoever is in the car for that stretch (riders + driver). A rider pays
// the sum of their stretches. Example (300 mi, $30 of gas, Ana off at mile 100):
//   miles 0–100:   driver, Ana, Ben  -> $10 / 3 = $3.33 each
//   miles 100–300: driver, Ben       -> $20 / 2 = $10.00 each
//   Ana pays $3.33, Ben pays $13.33, the driver covers their own $13.33.
// The IRS cap applies to every stretch. Totals round down to the cent.
// ---------------------------------------------------------------------------

export type RideLeg = { id: string; miles: number | null }; // null = the whole way

export type Stretch = {
  fromMile: number;
  toMile: number;
  people: number; // riders in the car + driver
  riderIds: string[];
  perPerson: number; // what each person in the car pays for this stretch (not rounded)
};

export function splitGasByRide(input: { routeMiles: number; mpg: number; gasPrice: number; riders: RideLeg[] }): {
  shares: Record<string, number>;
  stretches: Stretch[];
} {
  const { routeMiles, mpg, gasPrice } = input;
  const riders = input.riders.map((rider) => ({
    id: rider.id,
    miles: Math.min(Math.max(rider.miles ?? routeMiles, 0), routeMiles),
  }));
  const stops = [...new Set([0, ...riders.map((rider) => rider.miles), routeMiles])].sort((a, b) => a - b);

  const raw: Record<string, number> = Object.fromEntries(riders.map((rider) => [rider.id, 0]));
  const stretches: Stretch[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const fromMile = stops[i];
    const toMile = stops[i + 1];
    const inCar = riders.filter((rider) => rider.miles >= toMile - 1e-9);
    if (inCar.length === 0) continue; // the driver is alone; nothing to split
    const people = inCar.length + 1;
    const miles = toMile - fromMile;
    const fair = gasCost(miles, mpg, gasPrice) / people;
    const cap = (miles * IRS_MILEAGE_RATE) / people;
    const perPerson = Math.min(fair, cap);
    for (const rider of inCar) raw[rider.id] += perPerson;
    stretches.push({ fromMile, toMile, people, riderIds: inCar.map((rider) => rider.id), perPerson });
  }

  const shares = Object.fromEntries(Object.entries(raw).map(([id, amount]) => [id, floorToCents(amount)]));
  return { shares, stretches };
}
