import {
  friendlyError,
  GENERIC_MESSAGE,
  NETWORK_MESSAGE,
  NOT_ALLOWED_MESSAGE,
  NOT_SET_UP_MESSAGE,
  SIGNED_OUT_MESSAGE,
} from '../errors';

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('friendlyError', () => {
  it('explains network problems, even inside a longer message', () => {
    expect(friendlyError(new Error('TypeError: Network request failed'))).toBe(NETWORK_MESSAGE);
    expect(friendlyError(new Error("Couldn't load your trips: Failed to fetch"))).toBe(NETWORK_MESSAGE);
  });

  it('explains an expired sign-in', () => {
    expect(friendlyError(new Error('JWT expired'))).toBe(SIGNED_OUT_MESSAGE);
  });

  it('explains a missing database update', () => {
    expect(friendlyError(new Error("Could not find the 'vibe_chat' column of 'profiles' in the schema cache"))).toBe(NOT_SET_UP_MESSAGE);
    expect(friendlyError(new Error('function public.trip_split(uuid) does not exist'))).toBe(NOT_SET_UP_MESSAGE);
  });

  it('explains permission errors', () => {
    expect(friendlyError(new Error('new row violates row-level security policy for table "trips"'))).toBe(NOT_ALLOWED_MESSAGE);
  });

  it('keeps messages we wrote ourselves', () => {
    expect(friendlyError(new Error('This trip is full.'))).toBe('This trip is full.');
    expect(friendlyError(new Error('This is a sample trip, so you can’t request a seat.'))).toBe(
      'This is a sample trip, so you can’t request a seat.',
    );
  });

  it('uses the fallback when there is no message', () => {
    expect(friendlyError(undefined)).toBe(GENERIC_MESSAGE);
    expect(friendlyError(new Error('  '), "Couldn't send.")).toBe("Couldn't send.");
    expect(friendlyError('Plain text error')).toBe('Plain text error');
  });
});
