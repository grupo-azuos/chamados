import { type FilterRule } from '@template/shared/schemas/dashboard-board.schema';
import { PgDialect } from 'drizzle-orm/pg-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { filterToSql, InvalidFilterError } from './filter-sql.util';
import { SOURCE_TABLES } from './widget-sources';

const dialect = new PgDialect();
const permits = SOURCE_TABLES.infraTickets;

function compile(tree: Parameters<typeof filterToSql>[1]) {
  const condition = filterToSql(permits, tree);

  return condition ? dialect.sqlToQuery(condition) : null;
}

describe('filterToSql', () => {
  // feliz
  it('translates AND/OR groups and passes every value as a parameter', () => {
    const query = compile({
      combinator: 'and',
      rules: [
        { field: 'status', operator: 'in', value: ['Em andamento', 'Aguardando cliente'] },
        {
          combinator: 'or',
          not: true,
          rules: [
            { field: 'assignee', operator: 'contains', value: "Ana'; drop table x;--" },
            { field: 'createdAt', operator: 'between', value: ['2026-01-01', '2026-12-31'] },
          ],
        },
      ],
    });

    expect(query?.sql).toContain(' in (');
    expect(query?.sql).toContain(' or ');
    expect(query?.sql).toContain('not ');
    expect(query?.sql).not.toContain('drop table');
    expect(query?.params).toContain("%Ana'; drop table x;--%");
  });

  // feliz
  it('filters nothing for an empty group', () => {
    expect(compile({ combinator: 'and', rules: [] })).toBeNull();
  });

  // triste
  it('rejects unknown fields, invalid dates and text in date fields', () => {
    expect(() =>
      compile({ combinator: 'and', rules: [{ field: 'senha', operator: '=', value: 'x' }] }),
    ).toThrow(InvalidFilterError);
    expect(() =>
      compile({
        combinator: 'and',
        rules: [{ field: 'createdAt', operator: '>', value: '01/01/2026' }],
      }),
    ).toThrow('não é uma data');
    expect(() =>
      compile({
        combinator: 'and',
        rules: [{ field: 'createdAt', operator: 'contains', value: '2026' }],
      }),
    ).toThrow('só vale para texto');
  });

  // triste
  it('matches nobody with an empty list and rejects an open-ended "between"', () => {
    expect(
      compile({ combinator: 'and', rules: [{ field: 'status', operator: 'in', value: [] }] })?.sql,
    ).toContain('false');
    expect(() =>
      compile({
        combinator: 'and',
        rules: [{ field: 'createdAt', operator: 'between', value: ['2026-01-01'] }],
      }),
    ).toThrow('começo e um fim');
  });
});

describe('filterToSql with relative dates', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /* A data agendada é um DIA (sem fuso): os parâmetros da condição são só o dia pedido. */
  function dayOf(operator: FilterRule['operator'], value: FilterRule['value']) {
    const condition = filterToSql(SOURCE_TABLES.maintenanceSchedules, {
      combinator: 'and',
      rules: [{ field: 'scheduledFor', operator, value }],
    });

    return condition ? new PgDialect().sqlToQuery(condition).params : undefined;
  }

  // feliz
  it('turns each relative date into the day it means, for every date operator', () => {
    vi.useFakeTimers();
    /* Domingo, 15/11/2026, 10h em Brasília. */
    vi.setSystemTime(new Date('2026-11-15T13:00:00.000Z'));

    expect(dayOf('=', '@today')).toEqual(['2026-11-15']);
    expect(dayOf('<', '@today-7')).toEqual(['2026-11-08']);
    expect(dayOf('<=', '@today+3')).toEqual(['2026-11-18']);
    expect(dayOf('>', '@monthStart')).toEqual(['2026-11-01']);
    /* A semana começa na segunda. */
    expect(dayOf('>=', '@weekStart')).toEqual(['2026-11-09']);
    expect(dayOf('between', ['@monthStart', '@today'])).toEqual(['2026-11-01', '2026-11-15']);
    /* A data exata segue como veio. */
    expect(dayOf('<', '2026-12-31')).toEqual(['2026-12-31']);
  });

  // triste
  it('turns the day at midnight in Brasília, not at midnight in UTC', () => {
    vi.useFakeTimers();
    /* 02:30 em UTC ainda é 23:30 de domingo em Brasília. */
    vi.setSystemTime(new Date('2026-11-16T02:30:00.000Z'));
    expect(dayOf('=', '@today')).toEqual(['2026-11-15']);
    expect(dayOf('=', '@weekStart')).toEqual(['2026-11-09']);

    /* 03:30 em UTC é 00:30 de segunda em Brasília: outro dia, outra semana. */
    vi.setSystemTime(new Date('2026-11-16T03:30:00.000Z'));
    expect(dayOf('=', '@today')).toEqual(['2026-11-16']);
    expect(dayOf('=', '@weekStart')).toEqual(['2026-11-16']);
  });

  // triste
  it('refuses a relative date that is not one of the offered', () => {
    expect(() => dayOf('=', '@tomorrow')).toThrow('nem uma data relativa');
    expect(() => dayOf('=', '@today*2')).toThrow('nem uma data relativa');
  });
});

describe('filterToSql on the system name', () => {
  function compileSystem(rule: FilterRule) {
    const condition = filterToSql(SOURCE_TABLES.systemTickets, { combinator: 'and', rules: [rule] });

    return condition ? dialect.sqlToQuery(condition) : null;
  }

  // feliz
  /* "Trilha" e "trilha" são o mesmo sistema: o filtro compara os dois lados em minúsculas. */
  it('matches the system name without telling upper from lower case', () => {
    const equal = compileSystem({ field: 'project', operator: '=', value: 'Trilha' });
    const list = compileSystem({ field: 'project', operator: 'in', value: ['Trilha', 'Portal'] });

    expect(equal?.sql).toMatch(/^lower\(coalesce\(.*\) = lower\(\$1\)$/);
    expect(equal?.params).toEqual(['Trilha']);
    expect(list?.sql).toContain('in (lower($1), lower($2))');
  });

  it('groups the typed name by its lowercase, trimmed form', () => {
    const grouped = dialect.sqlToQuery(SOURCE_TABLES.systemTickets.dimensions.project!);

    expect(grouped.sql).toContain(
      `lower(btrim(regexp_replace("tickets"."tickets"."custom_system_name", '\\s+', ' ', 'g')))`,
    );
    expect(grouped.sql).toContain('lower(btrim(project.name)) =');
  });

  // triste
  it('keeps comparing other text fields exactly as typed', () => {
    const query = compile({
      combinator: 'and',
      rules: [{ field: 'assignee', operator: '=', value: 'Ana' }],
    });

    expect(query?.sql).not.toContain('lower(');
  });
});
