import { isStrongPassword, isValidUsername } from '@insta/shared';

describe('shared validation rules', () => {
  it.each(['madina', 'madina.dev', 'bob_1', 'a.b.c'])('accepts username %s', (name) => {
    expect(isValidUsername(name)).toBe(true);
  });

  it.each(['ab', '.madina', 'madina.', 'mad..ina', 'Madina', 'мадина', 'a'.repeat(31), 'with space'])(
    'rejects username %s',
    (name) => {
      expect(isValidUsername(name)).toBe(false);
    },
  );

  it.each(['Secret123', 'парол1234', 'Ҷавоб2026'])('accepts password %s', (password) => {
    expect(isStrongPassword(password)).toBe(true);
  });

  it.each(['short1', 'onlyletters', '12345678', 'x1'.repeat(40)])('rejects password %s', (password) => {
    expect(isStrongPassword(password)).toBe(false);
  });
});
