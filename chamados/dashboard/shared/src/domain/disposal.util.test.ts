import { describe, expect, it } from 'vitest';

import {
  DISPOSAL_TYPES,
  disposalTypeHint,
  disposalTypeLabel,
  disposalTypeTone,
  isDisposed,
} from './disposal.util';

describe('disposal catalog', () => {
  // feliz
  it('labels every type, with a hint and a tone', () => {
    for (const type of DISPOSAL_TYPES) {
      expect(disposalTypeLabel(type)).toBeTruthy();
      expect(disposalTypeHint(type)).toBeTruthy();
    }
    expect(disposalTypeTone('defect')).toBe('warning');
    expect(disposalTypeTone('scrap')).toBe('neutral');
  });

  // triste
  it('tells a disposed machine from one still in use', () => {
    expect(isDisposed({ disposedAt: '2026-10-20T12:00:00.000Z' })).toBe(true);
    expect(isDisposed({ disposedAt: null })).toBe(false);
  });
});
