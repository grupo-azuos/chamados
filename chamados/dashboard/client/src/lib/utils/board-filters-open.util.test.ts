import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  boardFiltersOpenKey,
  readBoardFiltersOpen,
  writeBoardFiltersOpen,
} from './board-filters-open.util';

describe('board filters open preference', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  // feliz
  it('starts open and remembers the choice per board', () => {
    expect(readBoardFiltersOpen('team')).toBe(true);

    writeBoardFiltersOpen('team', false);

    expect(window.localStorage.getItem(boardFiltersOpenKey('team'))).toBe('closed');
    expect(readBoardFiltersOpen('team')).toBe(false);
    expect(readBoardFiltersOpen('personal')).toBe(true);

    writeBoardFiltersOpen('team', true);

    expect(readBoardFiltersOpen('team')).toBe(true);
  });

  // triste
  it('falls back to open when the storage refuses to read or write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(() => writeBoardFiltersOpen('team', false)).not.toThrow();
    expect(readBoardFiltersOpen('team')).toBe(true);
  });

  it('treats an unknown saved value as open', () => {
    window.localStorage.setItem(boardFiltersOpenKey('team'), 'garbage');

    expect(readBoardFiltersOpen('team')).toBe(true);
  });
});
