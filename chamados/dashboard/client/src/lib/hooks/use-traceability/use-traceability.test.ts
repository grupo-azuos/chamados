import { describe, expect, it } from 'vitest';

import { parseTraceabilityPrefs } from './use-traceability.svelte';

describe('traceability prefs', () => {
  // feliz
  it('keeps where the map starts from', () => {
    expect(parseTraceabilityPrefs({ focus: 'person', id: 'u-1' })).toEqual({
      focus: 'person',
      id: 'u-1',
    });
  });

  // triste
  it('falls back field by field when what was saved is broken', () => {
    expect(parseTraceabilityPrefs({ focus: 'planet', id: 3 })).toEqual({
      focus: 'computer',
      id: '',
    });
    expect(parseTraceabilityPrefs(null)).toBeNull();
  });
});
