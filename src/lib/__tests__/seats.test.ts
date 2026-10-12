import { defaultOpenSeats, freeSeats, layoutForSeats, layoutSeats, passengerCount, SEAT_LAYOUTS, seatLabel, seatState, sortSeats } from '../seats';

describe('seat layouts', () => {
  it('has the right number of passenger seats', () => {
    expect(SEAT_LAYOUTS.map((option) => passengerCount(option.value))).toEqual([1, 3, 4, 4, 6, 7]);
  });

  it('marks only the tight middle seat as cramped', () => {
    expect(layoutSeats('5_cramped').filter((seat) => seat.cramped).map((seat) => seat.id)).toEqual(['back_middle']);
    expect(layoutSeats('5').some((seat) => seat.cramped)).toBe(false);
  });

  it('picks a layout for cars saved before seat maps', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(layoutForSeats)).toEqual(['2', '4', '4', '5', '7', '7', '8']);
  });

  it('labels every seat', () => {
    expect(seatLabel('front')).toBe('Front');
    expect(seatLabel('middle_middle')).toBe('Middle center');
    expect(seatLabel('nope')).toBe('Seat');
  });
});

describe('offering seats', () => {
  it('offers window seats before middle seats', () => {
    expect(defaultOpenSeats('5', 3)).toEqual(['front', 'back_left', 'back_right']);
    expect(defaultOpenSeats('8', 4)).toEqual(['front', 'middle_left', 'middle_right', 'back_left']);
  });

  it('never offers fewer than one seat', () => {
    expect(defaultOpenSeats('7', 0)).toEqual(['front']);
  });

  it('keeps seats in front-to-back order and drops unknown ones', () => {
    expect(sortSeats('5', ['back_right', 'front', 'middle_left'])).toEqual(['front', 'back_right']);
  });
});

describe('seat states', () => {
  const holds = [
    { seat: 'front', status: 'approved' as const, isMe: false, firstName: 'Red', avatarUrl: null },
    { seat: 'back_left', status: 'pending' as const, isMe: false, firstName: null, avatarUrl: null },
    { seat: 'back_right', status: 'pending' as const, isMe: true, firstName: 'Me', avatarUrl: null },
  ];
  const open = ['front', 'back_left', 'back_right', 'back_middle'];

  it('shows taken, held, yours, open and not-offered seats', () => {
    expect(seatState('front', open, holds)).toBe('taken');
    expect(seatState('back_left', open, holds)).toBe('held');
    expect(seatState('back_right', open, holds)).toBe('mine');
    expect(seatState('back_middle', open, holds)).toBe('open');
    expect(seatState('back_middle', ['front'], [])).toBe('off');
  });

  it('lists the seats a rider can still pick', () => {
    expect(freeSeats('5', open, holds)).toEqual(['back_middle']);
  });
});
