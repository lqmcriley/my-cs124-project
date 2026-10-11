import { IRS_MILEAGE_RATE } from '../config';
import { floorToCents, gasCost, priceTable, riderShare, tripPrice, tripPriceSummary } from '../pricing';

describe('gasCost', () => {
  it('is miles ÷ mpg × gas price', () => {
    // 150 mi ÷ 30 mpg = 5 gallons × $3.49 = $17.45
    expect(gasCost(150, 30, 3.49)).toBeCloseTo(17.45);
  });

  it('is zero for nonsense input', () => {
    expect(gasCost(0, 30, 3.49)).toBe(0);
    expect(gasCost(150, 0, 3.49)).toBe(0);
  });
});

describe('riderShare', () => {
  it('splits the gas cost across everyone, driver included', () => {
    // $17.45 ÷ 4 people = $4.3625 -> rounds down to $4.36
    expect(riderShare({ riderMiles: 150, mpg: 30, gasPrice: 3.49, peopleInCar: 4 })).toBe(4.36);
  });

  it('charges partial riders for only their miles', () => {
    // Half the distance costs half as much.
    const full = riderShare({ riderMiles: 140, mpg: 28, gasPrice: 4, peopleInCar: 3 });
    const half = riderShare({ riderMiles: 70, mpg: 28, gasPrice: 4, peopleInCar: 3 });
    expect(full).toBe(6.66); // 140/28*4 = 20 ÷ 3 = 6.666…
    expect(half).toBe(3.33);
  });

  it('never exceeds the IRS cap', () => {
    // A 5 MPG truck with $9 gas would be $1.80/mile; the cap is the IRS rate per mile.
    const share = riderShare({ riderMiles: 100, mpg: 5, gasPrice: 9, peopleInCar: 2 });
    expect(share).toBe(floorToCents((100 * IRS_MILEAGE_RATE) / 2));
    expect(share).toBeLessThan(gasCost(100, 5, 9) / 2);
  });

  it('is zero when there is nobody to split with', () => {
    expect(riderShare({ riderMiles: 100, mpg: 30, gasPrice: 3.5, peopleInCar: 1 })).toBe(0);
  });

  it('always rounds down so the driver never profits', () => {
    for (let people = 2; people <= 8; people++) {
      const share = riderShare({ riderMiles: 137.3, mpg: 31.7, gasPrice: 3.79, peopleInCar: people });
      expect(share * people).toBeLessThanOrEqual(gasCost(137.3, 31.7, 3.79) + 1e-9);
    }
  });
});

describe('tripPrice', () => {
  it('prices a seat for a given number of riders', () => {
    const price = tripPrice({ miles: 150, mpg: 30, gasPrice: 3.49, riders: 3 });
    expect(price).toMatchObject({ gallons: 5, riders: 3, peopleInCar: 4, perSeat: 4.36, capped: false });
    expect(price.totalGasCost).toBeCloseTo(17.45);
  });

  it('flags when the IRS cap kicks in', () => {
    expect(tripPrice({ miles: 100, mpg: 5, gasPrice: 9, riders: 1 }).capped).toBe(true);
  });
});

describe('priceTable', () => {
  it('gets cheaper per seat as more riders join', () => {
    const table = priceTable({ miles: 150, mpg: 30, gasPrice: 3.49, seatsOffered: 3 });
    // $17.45 split 2, 3 and 4 ways
    expect(table.map((row) => [row.riders, row.perSeat])).toEqual([
      [1, 8.72],
      [2, 5.81],
      [3, 4.36],
    ]);
  });
});

describe('tripPriceSummary', () => {
  const trip = { miles: 150, mpg: 30, gasPrice: 3.49, seatsOffered: 3 };

  it('shows the price if you join an empty car, and the full-car price', () => {
    const { ifYouJoin, ifFull } = tripPriceSummary({ ...trip, ridersBooked: 0 });
    expect(ifYouJoin.perSeat).toBe(8.72);
    expect(ifFull.perSeat).toBe(4.36);
  });

  it('drops as riders book', () => {
    expect(tripPriceSummary({ ...trip, ridersBooked: 1 }).ifYouJoin.perSeat).toBe(5.81);
    expect(tripPriceSummary({ ...trip, ridersBooked: 3 }).ifYouJoin.perSeat).toBe(4.36);
  });
});

describe('floorToCents', () => {
  it('handles float noise', () => {
    expect(floorToCents(0.1 + 0.2)).toBe(0.3);
    expect(floorToCents(12.999)).toBe(12.99);
  });
});
