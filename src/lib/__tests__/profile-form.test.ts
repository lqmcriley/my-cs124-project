import { initialFormValues, toCarRow, toContactRow, toProfileRow, validateProfileForm } from '../profile-form';

const rider = { ...initialFormValues(null, null), fullName: 'Alma Mater' };
const driver = {
  ...rider,
  isDriver: true,
  make: 'Honda',
  model: 'Civic',
  color: 'Silver',
  plate: 'abc1234',
  mpg: '32.5',
  seats: '3',
};

describe('validateProfileForm', () => {
  it('accepts a rider with just a name', () => {
    expect(validateProfileForm(rider)).toEqual({});
  });

  it('requires a name', () => {
    expect(validateProfileForm({ ...rider, fullName: '   ' }).fullName).toBeDefined();
  });

  it('rejects a bio that is too long', () => {
    expect(validateProfileForm({ ...rider, bio: 'x'.repeat(201) }).bio).toBeDefined();
  });

  it('ignores empty car fields for riders', () => {
    expect(validateProfileForm({ ...rider, mpg: 'abc' })).toEqual({});
  });

  it('accepts a complete driver', () => {
    expect(validateProfileForm(driver)).toEqual({});
  });

  it('requires every car field for drivers', () => {
    const errors = validateProfileForm({ ...rider, isDriver: true });
    expect(Object.keys(errors).sort()).toEqual(['color', 'make', 'model', 'mpg', 'plate', 'seats']);
  });

  it.each(['0', '4', '151', 'abc', ''])('rejects MPG %j', (mpg) => {
    expect(validateProfileForm({ ...driver, mpg }).mpg).toBeDefined();
  });

  it.each(['0', '8', '2.5', ''])('rejects seats %j', (seats) => {
    expect(validateProfileForm({ ...driver, seats }).seats).toBeDefined();
  });
});

describe('database rows', () => {
  it('turns blank optional fields into null', () => {
    expect(toProfileRow('user-1', { ...rider, fullName: ' Alma Mater ', major: '  ' })).toEqual({
      id: 'user-1',
      full_name: 'Alma Mater',
      year: null,
      major: null,
      bio: null,
      chat_preference: 'talk',
      vibe_chat: 2,
      vibe_music: 2,
      vibe_temp: 2,
      vibe_windows: 2,
      vibe_stops: 2,
    });
  });

  it('converts car numbers and uppercases the plate', () => {
    expect(toCarRow('user-1', driver)).toEqual({
      owner_id: 'user-1',
      make: 'Honda',
      model: 'Civic',
      color: 'Silver',
      plate: 'ABC1234',
      mpg: 32.5,
      seats: 3,
      body_type: 'sedan',
    });
  });

  it('pre-fills the form from a saved profile and car', () => {
    const values = initialFormValues(
      { id: 'u', full_name: 'A B', avatar_url: null, year: 'Junior', major: 'CS', bio: null, chat_preference: 'quiet' },
      { id: 'c', owner_id: 'u', make: 'Kia', model: 'Soul', color: 'Red', plate: 'X1', mpg: 30, seats: 4 },
    );
    expect(values).toMatchObject({ fullName: 'A B', year: 'Junior', vibes: { vibe_chat: 0, vibe_music: 2, vibe_temp: 2, vibe_windows: 2, vibe_stops: 2 }, isDriver: true, mpg: '30', seats: '4' });
  });
});

describe('vibes', () => {
  it('keeps the old quiet/talk setting in sync with the chat slider', () => {
    const quiet = toProfileRow('u', { ...initialFormValues(null, null), fullName: 'A', vibes: { vibe_chat: 1, vibe_music: 4, vibe_temp: 0, vibe_windows: 3, vibe_stops: 2 } });
    expect(quiet).toMatchObject({ chat_preference: 'quiet', vibe_chat: 1, vibe_music: 4, vibe_temp: 0 });
  });
});

describe('phone number', () => {
  it('is optional, checked, and saved in standard form', () => {
    const base = { ...initialFormValues(null, null), fullName: 'A' };
    expect(validateProfileForm({ ...base, phone: '' })).toEqual({});
    expect(validateProfileForm({ ...base, phone: 'call me' }).phone).toBeDefined();
    expect(toContactRow('u', { ...base, phone: '(217) 555-0123' })).toEqual({ user_id: 'u', phone: '+12175550123' });
    expect(toContactRow('u', base)).toBeNull();
  });

  it('shows a saved number nicely', () => {
    expect(initialFormValues(null, null, null, '+12175550123').phone).toBe('(217) 555-0123');
  });
});
