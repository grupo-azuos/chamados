import { describe, expect, it } from 'vitest';

import {
  backEntryOf,
  MAX_STACK_DEPTH,
  type NavigationEntry,
  nextStack,
  parseStack,
  pathLabelOf,
} from './navigation-stack.util';

const ROOTS = ['/infra/tickets', '/infra/computers', '/infra/dashboard'];

function entry(pathname: string, index: number | null = null): NavigationEntry {
  return { href: pathname, pathname, label: pathLabelOf(pathname), index };
}

describe('pathLabelOf', () => {
  // feliz
  it('names each screen of the three modules by its address', () => {
    expect(pathLabelOf('/infra/tickets/7')).toBe('o chamado');
    expect(pathLabelOf('/maintenance/tickets')).toBe('os chamados');
    expect(pathLabelOf('/infra/computers/3')).toBe('a máquina');
    expect(pathLabelOf('/system/projects/2')).toBe('o projeto');
    expect(pathLabelOf('/system/dashboard')).toBe('o painel');
  });

  // triste
  it('falls back to "the previous screen" for an unknown address', () => {
    expect(pathLabelOf('/nowhere')).toBe('a tela anterior');
  });
});

describe('nextStack', () => {
  // feliz
  it('stacks the screen the person left when another one opens', () => {
    const stack = nextStack([], entry('/infra/computers/3'), '/infra/tickets/7', ROOTS);

    expect(stack.map((item) => item.pathname)).toEqual(['/infra/computers/3']);
  });

  it('keeps the stack when only a filter or tab of the same screen changes', () => {
    const before = [entry('/infra/dashboard')];

    expect(nextStack(before, entry('/infra/tickets/7'), '/infra/tickets/7/', ROOTS)).toEqual(before);
  });

  it('cuts the stack back when the person returns to a screen already on the path', () => {
    const before = [entry('/infra/computers/3'), entry('/infra/tickets/7')];

    expect(nextStack(before, entry('/infra/tickets/9'), '/infra/tickets/7', ROOTS)).toEqual([
      entry('/infra/computers/3'),
    ]);
  });

  // triste
  it('starts with no stack on the first screen of the tab and on a menu screen', () => {
    expect(nextStack([], null, '/infra/tickets/7', ROOTS)).toEqual([]);
    expect(nextStack([entry('/infra/computers/3')], entry('/infra/tickets/7'), '/infra/tickets', ROOTS)).toEqual([]);
  });

  it('never grows past the ceiling', () => {
    const deep = Array.from({ length: MAX_STACK_DEPTH }, (_, index) => entry(`/infra/tickets/${index}`));

    expect(nextStack(deep, entry('/infra/computers/1'), '/infra/computers/2', ROOTS)).toHaveLength(
      MAX_STACK_DEPTH,
    );
  });
});

describe('backEntryOf and parseStack', () => {
  // feliz
  it('takes the top of the stack as the way back', () => {
    expect(backEntryOf([entry('/infra/dashboard'), entry('/infra/computers/3')])?.label).toBe('a máquina');
  });

  // triste
  it('drops anything stored without the right shape', () => {
    expect(backEntryOf([])).toBeNull();
    expect(parseStack('lixo')).toEqual([]);
    expect(parseStack([entry('/infra/tickets/1', 4), { href: 1 }, null])).toEqual([entry('/infra/tickets/1', 4)]);
  });
});
