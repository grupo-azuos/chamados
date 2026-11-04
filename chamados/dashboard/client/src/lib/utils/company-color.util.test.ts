import { describe, expect, it } from 'vitest';

import {
  COMPANY_COLOR_PALETTE,
  isHexColor,
  isLightColor,
  normalizeHexColor,
} from './company-color.util';

describe('isHexColor', () => {
  it('accepts a six digit hex color in any case', () => {
    expect(isHexColor('#a1B2c3')).toBe(true);
  });

  // triste
  it('rejects short, named and missing colors', () => {
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('a1b2c3')).toBe(false);
    expect(isHexColor(null)).toBe(false);
  });
});

describe('normalizeHexColor', () => {
  it('stores the color in lower case', () => {
    expect(normalizeHexColor('#A1B2C3')).toBe('#a1b2c3');
  });
});

describe('isLightColor', () => {
  it('keeps white text on every palette color', () => {
    for (const color of COMPANY_COLOR_PALETTE) expect(isLightColor(color)).toBe(false);
  });

  it('asks for dark text on a light color', () => {
    expect(isLightColor('#facc15')).toBe(true);
    expect(isLightColor('#ffffff')).toBe(true);
  });

  // triste
  it('does not call an invalid value light', () => {
    expect(isLightColor('amarelo')).toBe(false);
  });
});
