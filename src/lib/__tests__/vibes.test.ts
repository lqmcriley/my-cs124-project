import { chatPreferenceFromVibe, hasVibes, VIBES, vibeLabel, vibesFrom } from '../vibes';

const chat = VIBES[0];

describe('vibeLabel', () => {
  it('names each of the 5 stops', () => {
    expect([0, 1, 2, 3, 4].map((value) => vibeLabel(chat, value))).toEqual([
      'Quiet ride',
      'Leans quiet ride',
      'Either way',
      'Leans talk my ear off',
      'Talk my ear off',
    ]);
  });
});

describe('chatPreferenceFromVibe', () => {
  it('keeps the old quiet/talk setting in sync', () => {
    expect(chatPreferenceFromVibe(0)).toBe('quiet');
    expect(chatPreferenceFromVibe(1)).toBe('quiet');
    expect(chatPreferenceFromVibe(2)).toBe('talk');
    expect(chatPreferenceFromVibe(4)).toBe('talk');
  });
});

describe('vibesFrom', () => {
  it('fills in "Either way" for missing values', () => {
    expect(vibesFrom({ vibe_chat: 0 })).toEqual({ vibe_chat: 0, vibe_music: 2, vibe_temp: 2, vibe_windows: 2, vibe_stops: 2 });
    expect(vibesFrom(null).vibe_temp).toBe(2);
  });

  it('knows whether a profile has vibes yet', () => {
    expect(hasVibes({ vibe_music: 4 })).toBe(true);
    expect(hasVibes({})).toBe(false);
  });
});
