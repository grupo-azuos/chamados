import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { ticketInArea } from './ticket-area.util';

/* O SQL de verdade, como o banco vai receber — comparar os pedaços crus não diria nada. */
const dialect = new PgDialect();

describe('ticketInArea', () => {
  // feliz
  /* A mesma régua da fila: a área original OU a área somada como participante. */
  it('takes the original area or a participant area, for the area asked', () => {
    const query = dialect.sqlToQuery(ticketInArea('infra'));

    expect(query.sql).toContain('"tickets"."area" = $1');
    expect(query.sql).toContain('"ticket_areas"."ticket_id" = "tickets"."id"');
    expect(query.sql).toContain('"ticket_areas"."area" = $2');
    expect(query.params).toEqual(['infra', 'infra']);
  });

  // triste
  /* Sem o nome da tabela, `id` dentro da subconsulta seria o da área — e todo chamado casaria. */
  it('never compares the participant row with itself', () => {
    const { sql } = dialect.sqlToQuery(ticketInArea('sistema'));

    expect(sql).not.toMatch(/where "ticket_id" = "id"/);
  });
});
