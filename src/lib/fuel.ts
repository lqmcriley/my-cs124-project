// Fuel types. Gas, diesel and hybrid cars work in MPG and $/gallon. Electric
// cars work in miles per kWh and $/kWh to charge. The price math is the same:
// (miles ÷ efficiency) × price, split between everyone in the car.

import {
  DEFAULT_CHARGE_PRICE,
  DEFAULT_GAS_PRICE,
  MAX_CHARGE_PRICE,
  MAX_GAS_PRICE,
  MAX_MI_PER_KWH,
  MAX_MPG,
  MIN_CHARGE_PRICE,
  MIN_GAS_PRICE,
  MIN_MI_PER_KWH,
  MIN_MPG,
  MIN_MODEL_YEAR,
} from './config';

export type Fuel = 'regular' | 'premium' | 'diesel' | 'hybrid' | 'electric';

export const FUELS: { value: Fuel; label: string }[] = [
  { value: 'regular', label: 'Regular gas' },
  { value: 'premium', label: 'Premium gas' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'electric', label: 'Electric' },
];

export function isElectric(fuel: Fuel | null | undefined): boolean {
  return fuel === 'electric';
}

// The tag riders see on a trip. Regular gas needs no tag.
export function fuelTag(fuel: Fuel | null | undefined): string | null {
  if (!fuel || fuel === 'regular') return null;
  return FUELS.find((option) => option.value === fuel)?.label ?? null;
}

// Words and limits that change for electric cars.
export function energy(fuel: Fuel | null | undefined) {
  if (isElectric(fuel)) {
    return {
      efficiencyUnit: 'mi/kWh',
      efficiencyName: 'Miles per kWh',
      unit: 'kWh',
      thing: 'charging',
      priceName: 'Charging price',
      minEfficiency: MIN_MI_PER_KWH,
      maxEfficiency: MAX_MI_PER_KWH,
      minPrice: MIN_CHARGE_PRICE,
      maxPrice: MAX_CHARGE_PRICE,
      defaultPrice: DEFAULT_CHARGE_PRICE,
    };
  }
  return {
    efficiencyUnit: 'MPG',
    efficiencyName: 'MPG',
    unit: 'gal',
    thing: 'gas',
    priceName: 'Gas price',
    minEfficiency: MIN_MPG,
    maxEfficiency: MAX_MPG,
    minPrice: MIN_GAS_PRICE,
    maxPrice: MAX_GAS_PRICE,
    defaultPrice: DEFAULT_GAS_PRICE,
  };
}

// "32 MPG" or "3.5 mi/kWh"
export function efficiencyText(mpg: number, fuel: Fuel | null | undefined): string {
  return `${mpg} ${energy(fuel).efficiencyUnit}`;
}

// "Silver 2019 Honda Civic" (the year is left out for cars saved before it existed).
export function carName(car: { color: string; make: string; model: string; model_year?: number | null }): string {
  return [car.color, car.model_year, car.make, car.model].filter(Boolean).join(' ');
}

// Model years we accept: 1980 through next year (new models come out early).
export function validModelYear(year: number, now: Date = new Date()): boolean {
  return Number.isInteger(year) && year >= MIN_MODEL_YEAR && year <= now.getFullYear() + 1;
}
