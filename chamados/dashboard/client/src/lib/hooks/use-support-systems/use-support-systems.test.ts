import { describe, expect, it } from 'vitest';

import { filterSystems } from './use-support-systems.svelte';

const system = (id: number, name: string, description: string | null) => ({
  id,
  name,
  description,
  status: 'active' as const,
  openTickets: 0,
  openIssues: 0,
  lastActivityAt: null,
});

describe('filterSystems', () => {
  // feliz
  it('finds a system by its name or by what it is for', () => {
    const list = [system(1, 'Paralegal', 'Alvarás e contratos'), system(2, 'Chamados', null)];

    expect(filterSystems(list, 'ALVAR').map((item) => item.id)).toEqual([1]);
    expect(filterSystems(list, '  ').map((item) => item.id)).toEqual([1, 2]);
  });

  // triste
  it('finds nothing for a name that is not there', () => {
    expect(filterSystems([system(1, 'Paralegal', null)], 'zzz')).toEqual([]);
  });
});
