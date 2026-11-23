import { describe, expect, it } from 'vitest';

import { projectMapQuerySchema } from './project-map.schema';

describe('project map query', () => {
  // feliz
  it('reads the chosen systems, or none for all of them', () => {
    expect(projectMapQuerySchema.parse({ ids: '3,7' })).toEqual({ ids: [3, 7] });
    expect(projectMapQuerySchema.parse({})).toEqual({});
  });

  // triste
  it('refuses a list that is not of ids', () => {
    expect(projectMapQuerySchema.safeParse({ ids: '3,x' }).success).toBe(false);
  });
});
