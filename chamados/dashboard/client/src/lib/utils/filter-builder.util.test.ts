import { type FilterGroup } from '@template/shared/schemas/dashboard-board.schema';
import { describe, expect, it } from 'vitest';

import {
  canNest,
  dayValueLabel,
  emptyRule,
  enumOptionsOf,
  needsValue,
  operatorsFor,
  replaceNode,
  withField,
  withIds,
  withOperator,
} from './filter-builder.util';

describe('filter builder', () => {
  // feliz
  it('starts a condition on the first field of the source', () => {
    expect(emptyRule('infraTickets', 'r1')).toEqual({ id: 'r1', field: 'status', operator: '=', value: 'open' });
    expect(enumOptionsOf({ label: 'Prioridade', type: 'enum', options: ['high'] })).toEqual([{ value: 'high', label: 'Alta' }]);
  });

  // feliz
  it('offers the operators of each kind of field', () => {
    expect(operatorsFor({ type: 'date' })).toContain('between');
    expect(operatorsFor({ type: 'text' })).toContain('contains');
    expect(operatorsFor({ type: 'boolean' })).toEqual(['=']);
  });

  // feliz
  it('fits the value when the operator or the field changes', () => {
    const rule = emptyRule('infraTickets', 'r1');

    expect(withOperator(rule, 'in').value).toEqual([]);
    expect(withOperator(rule, 'null')).toMatchObject({ operator: 'null', value: null });
    expect(withOperator(rule, 'between').value).toEqual(['@monthStart', '@today']);
    expect(withField('infraTickets', rule, 'assignee')).toMatchObject({ field: 'assignee', operator: '=', value: '@me' });
    expect(needsValue('notNull')).toBe(false);
  });

  // feliz
  it('replaces or removes a node at any depth', () => {
    const tree: FilterGroup = {
      combinator: 'and',
      rules: [{ id: 'g', combinator: 'or', rules: [{ id: 'a', field: 'status', operator: '=', value: 'new' }] }],
    };

    const removed = replaceNode(tree, 'a', null);
    expect((removed.rules[0] as FilterGroup).rules).toEqual([]);
  });

  // triste
  it('keeps an unknown field as it was, and stops nesting at the limit', () => {
    const rule = emptyRule('infraTickets', 'r1');

    expect(withField('infraTickets', rule, 'owner')).toBe(rule);
    expect(canNest(4)).toBe(false);
    expect(canNest(1)).toBe(true);
  });

  // triste
  it('writes the day as read in Brazil, and leaves other text alone', () => {
    expect(dayValueLabel('@today-7')).toBe('Hoje − 7 dias');
    expect(dayValueLabel('2026-11-15')).toBe('15/11/2026');
    expect(dayValueLabel('ontem')).toBe('ontem');
  });
});

describe('withIds', () => {
  // feliz
  it('gives an id to every node that came without one', () => {
    const tree = withIds({ combinator: 'and', rules: [{ field: 'status', operator: '=', value: 'open' }] });

    expect(tree.id).toBeTruthy();
    expect(tree.rules[0]?.id).toBeTruthy();
  });

  // triste
  it('keeps the ids that were already there', () => {
    expect(withIds({ id: 'g', combinator: 'or', rules: [] }).id).toBe('g');
  });
});
