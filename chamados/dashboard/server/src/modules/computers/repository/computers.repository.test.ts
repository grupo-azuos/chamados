import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { sameDepartment } from './computers.repository';

/* O SQL de verdade, como o banco vai receber. */
const dialect = new PgDialect();

describe('sameDepartment', () => {
  // feliz
  /* "Contábil" do RH acha a máquina gravada como "CONTABIL": os dois lados viram "contabil". */
  it('compares both sides without accents, case or surrounding spaces', () => {
    const query = dialect.sqlToQuery(sameDepartment('Contábil'));

    expect(query.sql).toContain('lower(translate(trim("computers"."department")');
    expect(query.sql).toContain('lower(translate(trim($');
    expect(query.params).toContain('Contábil');
  });

  // triste
  /* O nome pedido entra como parâmetro, nunca colado no SQL. */
  it('never writes the requested name into the SQL text', () => {
    const { sql } = dialect.sqlToQuery(sameDepartment("Contábil'; drop table x; --"));

    expect(sql).not.toContain('drop table');
  });
});
