import { afterEach, describe, expect, it } from 'vitest';

import {
  clearScreenFilters,
  filterStorageKey,
  loadScreenFilters,
  saveScreenFilters,
} from './filter-storage.util';

const USER = '00000000-0000-4000-8000-000000000001';
const OTHER_USER = '00000000-0000-4000-8000-000000000002';

afterEach(() => window.localStorage.clear());

describe('filter storage', () => {
  // feliz
  it('keeps one entry per screen and per person', () => {
    saveScreenFilters(USER, 'infra-computers', { kind: 'notebook' });
    saveScreenFilters(USER, 'infra-parts', { outOfStockOnly: true });

    expect(loadScreenFilters(USER, 'infra-computers')).toEqual({ kind: 'notebook' });
    expect(loadScreenFilters(USER, 'infra-parts')).toEqual({ outOfStockOnly: true });
    expect(loadScreenFilters(OTHER_USER, 'infra-computers')).toBeUndefined();
  });

  it('clears only the screen asked, leaving the others as they were', () => {
    saveScreenFilters(USER, 'infra-computers', { kind: 'notebook' });
    saveScreenFilters(USER, 'infra-parts', { outOfStockOnly: true });

    clearScreenFilters(USER, 'infra-computers');

    expect(loadScreenFilters(USER, 'infra-computers')).toBeUndefined();
    expect(loadScreenFilters(USER, 'infra-parts')).toEqual({ outOfStockOnly: true });
  });

  // triste
  it('treats a broken or old saved value as absent, never as a broken screen', () => {
    window.localStorage.setItem(filterStorageKey(USER), '{quebrado');
    expect(loadScreenFilters(USER, 'infra-computers')).toBeUndefined();

    window.localStorage.setItem(filterStorageKey(USER), JSON.stringify({ version: 0, screens: {} }));
    expect(loadScreenFilters(USER, 'infra-computers')).toBeUndefined();
  });

  it('saves nothing while nobody is identified', () => {
    saveScreenFilters(undefined, 'infra-computers', { kind: 'notebook' });

    expect(window.localStorage.length).toBe(0);
  });
});

describe('filter storage — clearing what is not there and odd saved shapes', () => {
  // triste
  it('does nothing when clearing a screen that was never saved', () => {
    saveScreenFilters(USER, 'tickets', { search: 'x' });
    clearScreenFilters(USER, 'computers');
    clearScreenFilters(OTHER_USER, 'tickets');
    expect(loadScreenFilters(USER, 'tickets')).toEqual({ search: 'x' });
  });

  // triste
  it('ignores a saved value that is not an object, has another version or has screens as a list', () => {
    window.localStorage.setItem(filterStorageKey(USER), JSON.stringify('texto'));
    expect(loadScreenFilters(USER, 'tickets')).toBeUndefined();
    window.localStorage.setItem(filterStorageKey(USER), JSON.stringify({ version: 99, screens: {} }));
    expect(loadScreenFilters(USER, 'tickets')).toBeUndefined();
    window.localStorage.setItem(filterStorageKey(USER), JSON.stringify({ version: 1, screens: [] }));
    expect(loadScreenFilters(USER, 'tickets')).toBeUndefined();
  });
});
