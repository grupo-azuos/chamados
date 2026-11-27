import { DATA_SOURCES, dimensionsOf, fieldsOf } from '@template/shared/schemas/dashboard-board.schema';
import { PgDialect } from 'drizzle-orm/pg-core';
import { afterEach, describe, expect, it } from 'vitest';

import { forgetReferenceNames, rememberPeople } from '../../../lib/db/reference-names.util';
import { SOURCE_TABLES } from './widget-sources';

const dialect = new PgDialect();

afterEach(() => forgetReferenceNames());

describe('the task sources of the board', () => {
  // feliz
  it('counts only the tasks of the area that are still in use', () => {
    const infra = dialect.sqlToQuery(SOURCE_TABLES.infraTasks.inCirculation);
    const system = dialect.sqlToQuery(SOURCE_TABLES.systemTasks.inCirculation);

    expect(infra.sql).toContain('"archived_at" is null');
    expect(infra.params).toEqual(['infra']);
    expect(system.params).toEqual(['sistema']);
  });

  // feliz
  it('groups by the name of today of the owner, from the directory', () => {
    rememberPeople([{ id: 'u-ana', name: 'Ana Souza', email: 'ana@empresa.com.br' }]);

    const owner = dialect.sqlToQuery(SOURCE_TABLES.infraTasks.dimensions.owner!);

    expect(owner.sql).toContain('"tasks"."owner_id"');
    expect(owner.params).toEqual(expect.arrayContaining(['u-ana', 'Ana Souza', '(Sem responsável)']));
  });

  // triste
  it('says "(Sem responsável)", never the raw id, before the directory was read', () => {
    const owner = dialect.sqlToQuery(SOURCE_TABLES.systemTasks.dimensions.owner!);

    expect(owner.sql).toContain('null::text');
    expect(owner.params).toEqual(['(Sem responsável)']);
  });

  // triste
  /* As chaves do contrato e do banco têm de bater: campo que só existe de um lado quebra o bloco. */
  it('has in the database every field and grouping the contract offers', () => {
    for (const source of ['infraTasks', 'systemTasks'] as const) {
      expect(Object.keys(SOURCE_TABLES[source].fields).sort()).toEqual(Object.keys(fieldsOf(source)).sort());
      const grouped = [...Object.keys(SOURCE_TABLES[source].dimensions), ...Object.keys(SOURCE_TABLES[source].ageDates ?? {})];
      expect(grouped.sort()).toEqual(Object.keys(dimensionsOf(source)).sort());
      expect(DATA_SOURCES[source].noun).toBe('tarefas');
    }
  });
});
