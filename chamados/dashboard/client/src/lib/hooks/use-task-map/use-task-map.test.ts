import { describe, expect, it } from 'vitest';

import { parseTaskMapPrefs } from './use-task-map.svelte';

const DEFAULTS = { peopleIds: ['me'], positions: {} };

describe('task map prefs', () => {
  // feliz
  it('keeps the chosen people and where each island was left', () => {
    const saved = { peopleIds: ['ana', 'bia'], positions: { '7': { x: 10, y: 20 } } };

    expect(parseTaskMapPrefs(saved, DEFAULTS)).toEqual(saved);
  });

  // triste
  it('falls back to the defaults, field by field, when what was saved is broken', () => {
    expect(parseTaskMapPrefs({ peopleIds: [1], positions: { '7': { x: 'a' } } }, DEFAULTS)).toEqual(
      DEFAULTS,
    );
    expect(parseTaskMapPrefs({ positions: [] }, DEFAULTS)).toEqual(DEFAULTS);
    expect(parseTaskMapPrefs(null, DEFAULTS)).toBeNull();
  });
});
