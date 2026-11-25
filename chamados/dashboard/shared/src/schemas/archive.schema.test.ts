import { describe, expect, it } from 'vitest';

import { archivedFilterSchema, archivedQuerySchema, archiveSchema } from './archive.schema';

describe('archivedFilterSchema', () => {
  // feliz
  it('hides the archived when nobody asked for anything', () => {
    expect(archivedFilterSchema.parse(undefined)).toBe('hide');
    expect(archivedQuerySchema.parse({})).toEqual({ archived: 'hide' });
    expect(archivedFilterSchema.parse('only')).toBe('only');
  });

  // triste
  it('refuses a filter that does not exist', () => {
    expect(archivedFilterSchema.safeParse('all').success).toBe(false);
  });
});

describe('archiveSchema', () => {
  // feliz
  it('accepts the record in use and the archived one', () => {
    expect(archiveSchema.parse(null)).toBeNull();
    expect(
      archiveSchema.parse({ archivedAt: '2026-11-20T12:00:00.000Z', archivedBy: 'user-1' }),
    ).toEqual({ archivedAt: '2026-11-20T12:00:00.000Z', archivedBy: 'user-1' });
  });

  // triste
  it('refuses an archived record without the date', () => {
    expect(archiveSchema.safeParse({ archivedBy: null }).success).toBe(false);
  });
});
