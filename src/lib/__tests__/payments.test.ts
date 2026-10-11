import { cashAppLink, cleanHandle, handleError, payPalLink, venmoPayLink, venmoWebLink } from '../payments';

describe('cleanHandle', () => {
  it.each([
    ['@alma-mater', 'alma-mater'],
    ['  $AlmaM ', 'AlmaM'],
    ['https://venmo.com/u/alma-mater', 'alma-mater'],
    ['venmo.com/alma-mater', 'alma-mater'],
    ['https://cash.app/$AlmaM', 'AlmaM'],
    ['paypal.me/almam/10', 'almam'],
    ['almam', 'almam'],
  ])('%j -> %j', (raw, expected) => {
    expect(cleanHandle(raw)).toBe(expected);
  });
});

describe('handleError', () => {
  it('allows blanks', () => {
    expect(handleError('venmo', '')).toBeUndefined();
  });

  it('checks each app', () => {
    expect(handleError('venmo', 'alma-mater')).toBeUndefined();
    expect(handleError('venmo', 'abc')).toBeDefined(); // too short
    expect(handleError('cashapp', 'AlmaM')).toBeUndefined();
    expect(handleError('cashapp', '12345')).toBeDefined(); // needs a letter
    expect(handleError('paypal', 'alma.m')).toBeDefined();
  });
});

describe('pay links', () => {
  it('fills in the amount and note', () => {
    expect(venmoPayLink('alma-mater', 8.7, "Hitch Illini: O'Hare Oct 20")).toBe(
      "venmo://paycharge?txn=pay&recipients=alma-mater&amount=8.70&note=Hitch%20Illini%3A%20O'Hare%20Oct%2020",
    );
    expect(venmoWebLink('alma-mater', 8.7, 'Gas')).toBe('https://venmo.com/alma-mater?txn=pay&amount=8.70&note=Gas');
    expect(cashAppLink('AlmaM', 8.7)).toBe('https://cash.app/$AlmaM/8.70');
    expect(payPalLink('almam', 8.7)).toBe('https://paypal.me/almam/8.70USD');
  });
});
