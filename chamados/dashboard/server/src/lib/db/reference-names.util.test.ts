import { PgDialect } from 'drizzle-orm/pg-core';
import { afterEach, describe, expect, it } from 'vitest';

import {
  computerDepartmentNameSql,
  computerResponsibleNameSql,
  departmentNameOf,
  forgetReferenceNames,
  personOf,
  rememberDepartments,
  rememberPeople,
} from './reference-names.util';

const dialect = new PgDialect();

afterEach(() => forgetReferenceNames());

describe('reference names', () => {
  // feliz
  it('turns the last HR list into a lookup table inside the query, with the names as parameters', () => {
    rememberDepartments([
      { id: 12, name: 'Fiscal' },
      { id: 13, name: "O'Brien" },
    ]);

    const query = dialect.sqlToQuery(computerDepartmentNameSql());

    expect(query.sql).toContain('from (values');
    expect(query.sql).toContain('"computers"."department_id"');
    expect(query.sql).not.toContain("O'Brien");
    expect(query.params).toEqual([12, 'Fiscal', 13, "O'Brien"]);
    expect(departmentNameOf(12)).toBe('Fiscal');
  });

  // feliz
  it('names the responsible by the directory id', () => {
    rememberPeople([{ id: 'person-1', name: 'Ana Exemplo', email: 'ana@exemplo.invalid', image: '/a.png' }]);

    expect(dialect.sqlToQuery(computerResponsibleNameSql()).params).toEqual(['person-1', 'Ana Exemplo']);
    expect(personOf('person-1')).toEqual({ name: 'Ana Exemplo', avatarUrl: '/a.png' });
  });

  // triste
  it('answers null, never the raw id, before any list was read or for an unknown id', () => {
    expect(dialect.sqlToQuery(computerDepartmentNameSql()).sql).toBe('null::text');
    expect(dialect.sqlToQuery(computerResponsibleNameSql()).sql).toBe('null::text');
    expect(departmentNameOf(12)).toBeNull();
    expect(departmentNameOf(null)).toBeNull();
    expect(personOf('gone')).toBeNull();
    expect(personOf(null)).toBeNull();
  });
});
