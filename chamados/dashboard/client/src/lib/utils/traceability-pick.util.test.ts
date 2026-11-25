import { type ComputerListItem } from '@template/shared/schemas/computer.schema';
import { describe, expect, it } from 'vitest';

import {
  computerPicks,
  departmentPicks,
  filterPicks,
  onlyResponsibles,
  personPicks,
} from './traceability-pick.util';

const computer = (over: Partial<ComputerListItem>) =>
  ({
    id: 4,
    name: 'PARALEGAL-D04',
    displayName: 'Computador 04',
    responsibleName: 'Ana Souza',
    departmentId: 7,
    departmentName: 'Paralegal',
    isOnline: true,
    ...over,
  }) as ComputerListItem;

describe('traceability picks', () => {
  // feliz
  it('turns machines, departments and people into choices, and finds by name, hostname or who', () => {
    const machines = [
      computer({}),
      computer({
        id: 5,
        name: 'FISCAL-D01',
        displayName: null,
        departmentId: 8,
        responsibleName: null,
      }),
    ];
    const picks = computerPicks(machines);

    expect(picks[0]).toMatchObject({
      id: '4',
      title: 'Computador 04',
      subtitle: 'PARALEGAL-D04',
      isOnline: true,
    });
    expect(picks[1]?.detail).toContain('Sem responsável');
    expect(filterPicks(picks, 'ana', '').map((pick) => pick.id)).toEqual(['4']);
    expect(filterPicks(picks, '', '8').map((pick) => pick.id)).toEqual(['5']);
    expect(departmentPicks([{ value: '7', label: 'Paralegal' }], machines)[0]).toMatchObject({
      title: 'Paralegal',
      detail: '1 máquina',
    });
    const people = personPicks([
      { id: 'u1', name: 'Ana Souza', avatarUrl: null, computers: 2 },
      { id: 'u2', name: 'Bia Lima', avatarUrl: null, computers: 0 },
    ]);
    expect(people[0]).toMatchObject({
      id: 'u1',
      detail: '2 máquinas',
      person: { name: 'Ana Souza' },
    });
    expect(onlyResponsibles(people).map((pick) => pick.id)).toEqual(['u1']);
    expect(people[1]?.detail).toBe('Sem máquina');
  });

  // triste
  it('finds nothing for a name that is not there', () => {
    expect(filterPicks(computerPicks([computer({})]), 'zzz', '')).toEqual([]);
    expect(departmentPicks([{ value: '9', label: 'Vazio' }], [])[0]?.detail).toBe('0 máquinas');
  });
});
