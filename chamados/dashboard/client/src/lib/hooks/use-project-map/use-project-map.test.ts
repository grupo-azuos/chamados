import { describe, expect, it } from 'vitest';

import { parseProjectMapPrefs } from './use-project-map.svelte';

describe('project map prefs', () => {
  // feliz
  it('keeps the chosen projects, the period, the person and where each island was left', () => {
    const saved = {
      view: 'map',
      projectIds: ['1', '3'],
      positions: { '1': { x: 10, y: 20 } },
      from: '2026-11-01',
      to: '2026-11-30',
      personId: 'u-1',
      onlyMerges: true,
    };

    expect(parseProjectMapPrefs(saved)).toEqual(saved);
  });

  // triste
  it('falls back field by field when what was saved is broken', () => {
    expect(
      parseProjectMapPrefs({
        projectIds: [1],
        positions: { '1': { x: 'a' } },
        from: '01/11/2026',
        personId: 3,
      }),
    ).toEqual({
      view: 'cards',
      projectIds: [],
      positions: {},
      from: null,
      to: null,
      personId: '',
      onlyMerges: false,
    });
    expect(parseProjectMapPrefs('x')).toBeNull();
  });
});
