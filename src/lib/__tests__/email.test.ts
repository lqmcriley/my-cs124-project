import { isIllinoisEmail, normalizeEmail } from '../email';

describe('isIllinoisEmail', () => {
  it.each(['netid@illinois.edu', 'NetID@Illinois.EDU', '  jdoe2@illinois.edu  ', 'first.last@illinois.edu'])(
    'accepts %s',
    (email) => {
      expect(isIllinoisEmail(email)).toBe(true);
    },
  );

  it.each([
    '',
    'netid',
    '@illinois.edu',
    'netid@gmail.com',
    'netid@uiuc.edu',
    'netid@illinois.edu.evil.com',
    'netid@notillinois.edu',
    'netid@cs.illinois.edu',
    'a@b@illinois.edu',
    'net id@illinois.edu',
  ])('rejects %j', (email) => {
    expect(isIllinoisEmail(email)).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  NetID@Illinois.EDU ')).toBe('netid@illinois.edu');
  });
});
