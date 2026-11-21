import {
  type FilterGroup,
  type FilterRule,
  isFilterGroup,
  isRelativeDay,
  resolveRelativeDay,
} from '@template/shared/schemas/dashboard-board.schema';
import { and, not, or, sql, type SQL } from 'drizzle-orm';

import { type SourceColumn, type SourceTable, todayInBrasilia } from './widget-sources';

/** Um filtro que não dá para traduzir — vira 422 com a frase, para a pessoa corrigir. */
export class InvalidFilterError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A ÁRVORE DE FILTRO VIRA SQL — e só pelo que este arquivo conhece: o campo sai do mapa da
 * fonte, o operador de uma lista fechada, e todo valor entra como PARÂMETRO. Grupo vazio não
 * filtra nada (`undefined`).
 */
export function filterToSql(source: SourceTable, group: FilterGroup): SQL | undefined {
  const parts = group.rules
    .map((node) => (isFilterGroup(node) ? filterToSql(source, node) : ruleToSql(source, node)))
    .filter((part): part is SQL => part !== undefined);
  if (parts.length === 0) return undefined;

  const joined = group.combinator === 'or' ? or(...parts) : and(...parts);

  return group.not && joined ? not(joined) : joined;
}

function ruleToSql(source: SourceTable, rule: FilterRule): SQL {
  const column = source.fields[rule.field];
  if (!column) throw new InvalidFilterError(`O campo "${rule.field}" não existe nesta fonte.`);
  const { expression } = column;

  switch (rule.operator) {
    case 'null':
      return sql`${expression} is null`;
    case 'notNull':
      return sql`${expression} is not null`;
    case 'in':
    case 'notIn':
      return listRule(column, rule);
    case 'contains':
    case 'doesNotContain':
    case 'beginsWith':
      return textRule(column, rule);
    case 'between':
      return betweenRule(column, rule);
    default:
      return compareRule(column, rule);
  }
}

function compareRule(column: SourceColumn, rule: FilterRule): SQL {
  const value = scalar(column, rule.value);
  const operators = {
    '=': sql`=`,
    '!=': sql`is distinct from`,
    '<': sql`<`,
    '<=': sql`<=`,
    '>': sql`>`,
    '>=': sql`>=`,
  };
  const operator = operators[rule.operator as keyof typeof operators];
  if (!operator) throw new InvalidFilterError(`O operador "${rule.operator}" não vale aqui.`);

  return sql`${column.expression} ${operator} ${value}`;
}

function listRule(column: SourceColumn, rule: FilterRule): SQL {
  const values = listOf(rule.value).map((value) => scalar(column, value));
  if (values.length === 0) return rule.operator === 'in' ? sql`false` : sql`true`;
  const list = sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );

  return rule.operator === 'in'
    ? sql`${column.expression} in (${list})`
    : sql`(${column.expression} is null or ${column.expression} not in (${list}))`;
}

function textRule(column: SourceColumn, rule: FilterRule): SQL {
  if (column.type === 'date' || column.type === 'boolean') {
    throw new InvalidFilterError(`"${rule.operator}" só vale para texto.`);
  }
  const text = String(rule.value ?? '').replace(/[\\%_]/g, (character) => `\\${character}`);
  if (rule.operator === 'beginsWith') return sql`${column.expression} ilike ${`${text}%`}`;
  const pattern = `%${text}%`;

  return rule.operator === 'contains'
    ? sql`${column.expression} ilike ${pattern}`
    : sql`(${column.expression} is null or ${column.expression} not ilike ${pattern})`;
}

function betweenRule(column: SourceColumn, rule: FilterRule): SQL {
  const [from, to] = listOf(rule.value);
  if (from === undefined || to === undefined) {
    throw new InvalidFilterError('"Entre" precisa de um começo e um fim.');
  }

  return sql`${column.expression} between ${scalar(column, from)} and ${scalar(column, to)}`;
}

function listOf(value: FilterRule['value']): (string | number)[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string')
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  if (typeof value === 'number') return [value];

  return [];
}

/** O valor no tipo do campo — data no formato ISO (ou relativa), sim/não como booleano. */
function scalar(column: SourceColumn, value: FilterRule['value']): string | number | boolean {
  if (column.type === 'boolean') return value === true || value === 'true';
  if (value === null || value === undefined || Array.isArray(value)) {
    throw new InvalidFilterError('Falta o valor de uma condição.');
  }
  if (column.type === 'date') return dayOf(String(value));

  return typeof value === 'boolean' ? String(value) : value;
}

/**
 * O dia de uma condição de data: um dia exato, ou uma data RELATIVA ("@today-7", "@monthStart")
 * trocada pelo dia que ela quer dizer hoje — o hoje de Brasília, como o resto do painel. O banco
 * recebe sempre um dia exato, como parâmetro.
 */
function dayOf(value: string): string {
  if (isRelativeDay(value)) return resolveRelativeDay(value, todayInBrasilia());
  if (!ISO_DATE.test(value)) {
    throw new InvalidFilterError(`"${value}" não é uma data (aaaa-mm-dd) nem uma data relativa.`);
  }

  return value;
}
