import { OLD_CPU_PATTERNS, UPGRADE_MEMORY_BYTES } from '@template/shared/domain/computer-upgrade.util';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { responsibleCondition, upgradeCondition } from './computers.repository';

const dialect = new PgDialect();

/** O SQL que o filtro vira — o Postgres de verdade é provado no E2E (`computers-filters.e2e`). */
const render = (condition: ReturnType<typeof responsibleCondition | typeof upgradeCondition>) =>
  condition ? dialect.sqlToQuery(condition) : undefined;

describe('responsibleCondition', () => {
  // feliz
  it('compares the stored person id with the chosen one, as a parameter', () => {
    const query = render(responsibleCondition({ kind: 'person', id: 'person-1' }));

    expect(query?.sql).toContain('"inventory"."computers"."responsible_id" = $1');
    expect(query?.params).toEqual(['person-1']);
  });

  // feliz
  it('asks for an empty id on "no responsible"', () => {
    expect(render(responsibleCondition({ kind: 'none' }))?.sql).toContain('"responsible_id" is null');
  });

  // triste
  it('adds no condition when no responsible filter was asked', () => {
    expect(responsibleCondition(undefined)).toBeUndefined();
  });
});

describe('upgradeCondition', () => {
  // feliz
  it('sends the shared memory threshold and every old processor pattern as parameters', () => {
    const memory = render(upgradeCondition('memory'));
    const cpu = render(upgradeCondition('cpu'));

    expect(memory?.params).toEqual([UPGRADE_MEMORY_BYTES]);
    expect(cpu?.params).toEqual([...OLD_CPU_PATTERNS]);
    expect(cpu?.sql).toContain('~*');
  });

  // feliz
  it('joins the three reasons with "or" on "any"', () => {
    const any = render(upgradeCondition('any'));

    expect(any?.params).toEqual(expect.arrayContaining([UPGRADE_MEMORY_BYTES, ...OLD_CPU_PATTERNS]));
    expect(any?.sql).toContain(' or ');
  });

  // triste
  it('adds no condition while the upgrade filter is off', () => {
    expect(upgradeCondition(undefined)).toBeUndefined();
  });
});
