import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { archivedCondition, archiveValues, toArchive } from './archive.util';
import { maintenances } from './schema/maintenances.schema';

const dialect = new PgDialect();

function sqlOf(filter: 'hide' | 'show' | 'only'): string | undefined {
  const condition = archivedCondition(maintenances.archivedAt, filter);

  return condition ? dialect.sqlToQuery(condition).sql : undefined;
}

describe('archivedCondition', () => {
  // feliz
  it('hides the archived by default and brings only them when asked', () => {
    expect(sqlOf('hide')).toContain('is null');
    expect(sqlOf('only')).toContain('is not null');
  });

  // triste
  it('does not filter at all when the list asks for everything', () => {
    expect(sqlOf('show')).toBeUndefined();
  });
});

describe('archiveValues', () => {
  // feliz
  it('stamps when and who archived', () => {
    const values = archiveValues(true, 'user-1');

    expect(values.archivedAt).toBeInstanceOf(Date);
    expect(values.archivedBy).toBe('user-1');
  });

  // triste
  it('clears both columns when restoring', () => {
    expect(archiveValues(false, 'user-1')).toEqual({ archivedAt: null, archivedBy: null });
  });
});

describe('toArchive', () => {
  // feliz
  it('turns the row into the contract block', () => {
    const archivedAt = new Date('2026-11-20T12:00:00.000Z');

    expect(toArchive({ archivedAt, archivedBy: 'user-1' })).toEqual({
      archivedAt: '2026-11-20T12:00:00.000Z',
      archivedBy: 'user-1',
    });
  });

  // triste
  it('is null while the record is in use', () => {
    expect(toArchive({ archivedAt: null, archivedBy: null })).toBeNull();
  });
});
