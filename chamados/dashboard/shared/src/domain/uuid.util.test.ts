import { describe, expect, it } from 'vitest';

import { isUuid, uuidV7 } from './uuid.util';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidV7', () => {
  // feliz
  it('generates a version 7 uuid with the RFC variant', () => {
    expect(uuidV7()).toMatch(UUID_V7);
  });

  // feliz
  it('starts with the creation instant, so it sorts by creation', () => {
    expect(uuidV7(1_700_000_000_000).slice(0, 13)).toBe('018bcfe5-6800');
    expect(uuidV7(1_700_000_000_000) < uuidV7(1_700_000_000_001)).toBe(true);
  });

  // triste
  it('does not repeat within the same millisecond', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidV7(1_700_000_000_000)));

    expect(ids.size).toBe(1000);
  });
});

describe('isUuid', () => {
  // feliz
  it('accepts a uuid', () => {
    expect(isUuid(uuidV7())).toBe(true);
  });

  // triste
  it('rejects numbers, loose text and empty values', () => {
    expect(isUuid(42)).toBe(false);
    expect(isUuid('42')).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});
