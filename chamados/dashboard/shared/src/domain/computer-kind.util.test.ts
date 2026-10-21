import { describe, expect, it } from 'vitest';

import { COMPUTER_KINDS, computerKindLabel } from './computer-kind.util';

describe('computerKindLabel', () => {
  // feliz
  it('names each kind the way the screen shows it', () => {
    expect(computerKindLabel('desktop')).toBe('Desktop');
    expect(computerKindLabel('notebook')).toBe('Notebook');
  });

  // triste
  it('offers no kind beyond desktop and notebook', () => {
    expect(COMPUTER_KINDS).toEqual(['desktop', 'notebook']);
  });
});
