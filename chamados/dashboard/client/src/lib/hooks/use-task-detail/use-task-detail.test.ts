import { describe, expect, it } from 'vitest';

import { moved, stepsInputOf } from './use-task-detail.svelte';

describe('task detail helpers', () => {
  // feliz
  it('sends the flow in the order of the screen, keeping the id of the steps that already exist', () => {
    expect(stepsInputOf([{ id: 3, label: ' Comprar ' }, { label: 'Instalar' }])).toEqual({
      steps: [{ id: 3, label: 'Comprar' }, { label: 'Instalar' }],
    });
    expect(moved(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });

  // triste
  it('drops empty steps and does not move past the ends', () => {
    expect(stepsInputOf([{ label: '   ' }])).toEqual({ steps: [] });
    expect(moved(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moved(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});
