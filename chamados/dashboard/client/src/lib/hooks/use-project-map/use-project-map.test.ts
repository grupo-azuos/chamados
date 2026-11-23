import { describe, expect, it } from 'vitest';

import { parseProjectMapPrefs } from './use-project-map.svelte';

describe('project map prefs', () => {
  // feliz
  it('keeps the chosen projects and where each island was left', () => {
    const saved = { view: 'map', projectIds: ['1', '3'], positions: { '1': { x: 10, y: 20 } } };

    expect(parseProjectMapPrefs(saved)).toEqual(saved);
  });

  // triste
  it('falls back field by field when what was saved is broken', () => {
    expect(parseProjectMapPrefs({ projectIds: [1], positions: { '1': { x: 'a' } } })).toEqual({
      view: 'cards',
      projectIds: [],
      positions: {},
    });
    expect(parseProjectMapPrefs('x')).toBeNull();
  });
});
