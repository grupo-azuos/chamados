import { describe, expect, it } from 'vitest';

import { BRAZIL_STATES, HOME_STATE, isBrazilState } from './brazil-state.util';

describe('brazil states', () => {
  // feliz
  it('knows the 27 states, with Goiás as the home one', () => {
    expect(BRAZIL_STATES).toHaveLength(27);
    expect(isBrazilState(HOME_STATE)).toBe(true);
    expect(isBrazilState(' sp ')).toBe(true);
  });

  // triste
  it('refuses a made-up abbreviation', () => {
    expect(isBrazilState('XX')).toBe(false);
    expect(isBrazilState('')).toBe(false);
  });
});
