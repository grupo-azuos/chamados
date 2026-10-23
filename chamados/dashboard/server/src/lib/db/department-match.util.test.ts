import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { departmentMatches } from './department-match.util';
import { computers } from './schema/computers.schema';

/* O SQL de verdade, como o banco vai receber. */
const dialect = new PgDialect();

describe('departmentMatches', () => {
  // feliz
  /* "Departamento Pessoal" do RH acha "DEPARTAMENTO PESSOAL" (sem acento e maiúscula) e o
     código antigo `pessoal`. */
  it('matches the name without accents or case, and the legacy code', () => {
    const query = dialect.sqlToQuery(departmentMatches(computers.department, 'Departamento Pessoal'));

    expect(query.sql).toContain('lower(translate(trim("computers"."department")');
    expect(query.sql).toContain(' or ');
    expect(query.params).toContain('Departamento Pessoal');
    expect(query.params).toContain('pessoal');
  });

  // triste
  it('compares only by name when there is no legacy code, never writing the name into the SQL', () => {
    const query = dialect.sqlToQuery(departmentMatches(computers.department, "Novo'; drop table x; --"));

    expect(query.sql).not.toContain(' or ');
    expect(query.sql).not.toContain('drop table');
  });
});
