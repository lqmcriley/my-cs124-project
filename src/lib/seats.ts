// Seat maps. Each car has a layout (how many seats, in which rows). Drivers pick
// which seats to offer on a trip, and riders tap the seat they want.
// The same layouts live in the database (public.layout_seats) — keep them in sync.

export type SeatLayout = '2' | '4' | '5' | '5_cramped' | '7' | '8';

export type SeatId =
  | 'front'
  | 'middle_left'
  | 'middle_middle'
  | 'middle_right'
  | 'back_left'
  | 'back_middle'
  | 'back_right';

export type Seat = { id: SeatId; label: string; cramped: boolean };

// Rows from front to back. The driver sits front-left and isn't a passenger seat.
export type SeatRow = Seat[];

const S = (id: SeatId, label: string, cramped = false): Seat => ({ id, label, cramped });
const FRONT = S('front', 'Front');
const MIDDLE_2 = [S('middle_left', 'Middle left'), S('middle_right', 'Middle right')];
const MIDDLE_3 = [S('middle_left', 'Middle left'), S('middle_middle', 'Middle center'), S('middle_right', 'Middle right')];
const BACK_2 = [S('back_left', 'Back left'), S('back_right', 'Back right')];
const BACK_3 = [S('back_left', 'Back left'), S('back_middle', 'Back middle'), S('back_right', 'Back right')];
const BACK_3_CRAMPED = [S('back_left', 'Back left'), S('back_middle', 'Back middle', true), S('back_right', 'Back right')];

// Passenger rows (front row = the front passenger seat only).
const ROWS: Record<SeatLayout, SeatRow[]> = {
  '2': [[FRONT]],
  '4': [[FRONT], BACK_2],
  '5': [[FRONT], BACK_3],
  '5_cramped': [[FRONT], BACK_3_CRAMPED],
  '7': [[FRONT], MIDDLE_2, BACK_3],
  '8': [[FRONT], MIDDLE_3, BACK_3],
};

export const SEAT_LAYOUTS: { value: SeatLayout; label: string; hint: string }[] = [
  { value: '2', label: '2 seats', hint: 'You + 1 (small coupe, single-cab truck)' },
  { value: '4', label: '4 seats', hint: 'You + 3 (two in the back)' },
  { value: '5', label: '5 seats', hint: 'You + 4 (three in the back)' },
  { value: '5_cramped', label: '5 seats, tight middle', hint: 'You + 4, the back middle seat is cramped' },
  { value: '7', label: '7 seats', hint: 'You + 6 (minivan or 3-row SUV)' },
  { value: '8', label: '8 seats', hint: 'You + 7 (minivan with a middle bench)' },
];

export function seatRows(layout: SeatLayout): SeatRow[] {
  return ROWS[layout];
}

export function layoutSeats(layout: SeatLayout): Seat[] {
  return ROWS[layout].flat();
}

// Passenger seats (not counting the driver).
export function passengerCount(layout: SeatLayout): number {
  return layoutSeats(layout).length;
}

export function seatLabel(id: string): string {
  // The 8-seat layout has every seat, so it knows every label.
  return layoutSeats('8').find((seat) => seat.id === id)?.label ?? 'Seat';
}

// A sensible layout for a car saved before seat maps existed.
export function layoutForSeats(seats: number): SeatLayout {
  if (seats <= 1) return '2';
  if (seats <= 3) return '4';
  if (seats === 4) return '5';
  if (seats <= 6) return '7';
  return '8';
}

// Which seats fill up first: front, then window seats, then middle seats.
const PREFERENCE: SeatId[] = ['front', 'middle_left', 'middle_right', 'back_left', 'back_right', 'middle_middle', 'back_middle'];

// Seats offered by default when posting: the best `max` seats, never cramped ones.
export function defaultOpenSeats(layout: SeatLayout, max = Infinity): SeatId[] {
  const comfy = layoutSeats(layout).filter((seat) => !seat.cramped);
  const best = [...comfy].sort((a, b) => PREFERENCE.indexOf(a.id) - PREFERENCE.indexOf(b.id));
  const picked = best.slice(0, Math.max(1, Math.min(max, best.length))).map((seat) => seat.id);
  return sortSeats(layout, picked);
}

// Keep the driver's chosen seats in the layout's front-to-back order.
export function sortSeats(layout: SeatLayout, seats: string[]): SeatId[] {
  return layoutSeats(layout)
    .map((seat) => seat.id)
    .filter((id) => seats.includes(id));
}

export type SeatHold = { seat: string; status: 'pending' | 'approved'; isMe: boolean; firstName: string | null; avatarUrl: string | null };

export type SeatState = 'driver' | 'open' | 'held' | 'taken' | 'mine' | 'off';

// What one seat looks like right now.
export function seatState(seat: SeatId, openSeats: string[], holds: SeatHold[]): SeatState {
  const hold = holds.find((candidate) => candidate.seat === seat);
  if (hold?.isMe) return 'mine';
  if (hold) return hold.status === 'approved' ? 'taken' : 'held';
  return openSeats.includes(seat) ? 'open' : 'off';
}

// Seats a rider can still pick.
export function freeSeats(layout: SeatLayout, openSeats: string[], holds: SeatHold[]): SeatId[] {
  return layoutSeats(layout)
    .map((seat) => seat.id)
    .filter((id) => seatState(id, openSeats, holds) === 'open');
}
