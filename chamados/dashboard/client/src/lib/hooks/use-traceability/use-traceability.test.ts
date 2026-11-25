import { describe, expect, it } from 'vitest';

import { choiceOf, parseTraceabilityPrefs } from './use-traceability.svelte';

describe('traceability prefs and address', () => {
  // feliz
  it('keeps where the map starts from, and reads it from the address', () => {
    expect(parseTraceabilityPrefs({ focus: 'person', id: 'u-1' })).toEqual({
      focus: 'person',
      id: 'u-1',
    });
    expect(choiceOf(new URLSearchParams('focus=computer&id=4&ticket=52'))).toEqual({
      focus: 'computer',
      id: '4',
    });
  });

  // triste
  it('falls back when what was saved or the address is broken', () => {
    expect(parseTraceabilityPrefs({ focus: 'planet', id: 3 })).toEqual({
      focus: 'computer',
      id: '',
    });
    expect(parseTraceabilityPrefs(null)).toBeNull();
    expect(choiceOf(new URLSearchParams('focus=planet&id=4'))).toBeNull();
  });
});
