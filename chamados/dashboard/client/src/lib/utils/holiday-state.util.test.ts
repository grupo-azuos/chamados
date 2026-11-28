import { afterEach, describe, expect, it } from 'vitest';

import {
  HOLIDAY_STATE_OPTIONS,
  holidayStateOf,
  readHolidayState,
  writeHolidayState,
} from './holiday-state.util';

afterEach(() => window.localStorage.clear());

describe('holiday state', () => {
  // feliz
  it('remembers the chosen state, and offers the 27 of them', () => {
    writeHolidayState('SP');

    expect(readHolidayState()).toBe('SP');
    expect(HOLIDAY_STATE_OPTIONS).toHaveLength(27);
    expect(holidayStateOf(' sp ')).toBe('SP');
  });

  // triste
  it('falls back to Goiás for nothing stored or a made-up state', () => {
    expect(readHolidayState()).toBe('GO');
    window.localStorage.setItem('azuos-holidays-state', 'XX');

    expect(readHolidayState()).toBe('GO');
    expect(holidayStateOf('XX')).toBeNull();
  });
});
