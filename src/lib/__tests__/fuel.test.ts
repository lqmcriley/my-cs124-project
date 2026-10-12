import { carName, efficiencyText, energy, fuelTag, validModelYear } from '../fuel';

describe('fuel', () => {
  it('tags every fuel except regular gas', () => {
    expect(fuelTag('regular')).toBeNull();
    expect(fuelTag(undefined)).toBeNull();
    expect(fuelTag('premium')).toBe('Premium gas');
    expect(fuelTag('electric')).toBe('Electric');
  });

  it('uses charging words and limits for electric cars', () => {
    expect(energy('electric')).toMatchObject({ unit: 'kWh', efficiencyUnit: 'mi/kWh', priceName: 'Charging price', defaultPrice: 0.2 });
    expect(energy('diesel')).toMatchObject({ unit: 'gal', efficiencyUnit: 'MPG', priceName: 'Gas price' });
    expect(efficiencyText(3.8, 'electric')).toBe('3.8 mi/kWh');
    expect(efficiencyText(32, 'hybrid')).toBe('32 MPG');
  });
});

describe('cars', () => {
  it('names a car with its year when known', () => {
    expect(carName({ color: 'Silver', make: 'Honda', model: 'Civic', model_year: 2019 })).toBe('Silver 2019 Honda Civic');
    expect(carName({ color: 'Silver', make: 'Honda', model: 'Civic', model_year: null })).toBe('Silver Honda Civic');
  });

  it('accepts model years from 1980 to next year', () => {
    const now = new Date('2026-10-12T12:00:00');
    expect(validModelYear(2027, now)).toBe(true);
    expect(validModelYear(2028, now)).toBe(false);
    expect(validModelYear(1979, now)).toBe(false);
    expect(validModelYear(2019.5, now)).toBe(false);
  });
});
