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
